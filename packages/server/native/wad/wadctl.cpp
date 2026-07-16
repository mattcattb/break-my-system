#include <algorithm>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <limits>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <vector>

namespace {

struct Descriptor {
  std::uint32_t offset;
  std::uint32_t length;
  std::string name;
};

struct Entry {
  std::string kind;
  std::string name;
  std::string path;
  std::uint32_t offset = 0;
  std::uint32_t length = 0;
  std::vector<std::size_t> children;
};

std::string jsonEscape(const std::string &value) {
  std::string escaped;
  escaped.reserve(value.size());

  for (const unsigned char character : value) {
    switch (character) {
      case '"': escaped += "\\\""; break;
      case '\\': escaped += "\\\\"; break;
      case '\b': escaped += "\\b"; break;
      case '\f': escaped += "\\f"; break;
      case '\n': escaped += "\\n"; break;
      case '\r': escaped += "\\r"; break;
      case '\t': escaped += "\\t"; break;
      default:
        if (character < 0x20) {
          const char hex[] = "0123456789abcdef";
          escaped += "\\u00";
          escaped += hex[(character >> 4) & 0x0f];
          escaped += hex[character & 0x0f];
        } else {
          escaped += static_cast<char>(character);
        }
    }
  }

  return escaped;
}

std::uint32_t readUint32(const unsigned char *bytes) {
  return static_cast<std::uint32_t>(bytes[0]) |
         (static_cast<std::uint32_t>(bytes[1]) << 8) |
         (static_cast<std::uint32_t>(bytes[2]) << 16) |
         (static_cast<std::uint32_t>(bytes[3]) << 24);
}

bool endsWith(const std::string &value, const std::string &suffix) {
  return value.size() >= suffix.size() &&
         value.compare(value.size() - suffix.size(), suffix.size(), suffix) == 0;
}

bool isMapMarker(const std::string &name) {
  const bool episodeMap = name.size() == 4 && name[0] == 'E' &&
                          name[1] >= '0' && name[1] <= '9' &&
                          name[2] == 'M' && name[3] >= '0' && name[3] <= '9';
  const bool numberedMap = name.size() == 5 && name.rfind("MAP", 0) == 0 &&
                           name[3] >= '0' && name[3] <= '9' &&
                           name[4] >= '0' && name[4] <= '9';
  return episodeMap || numberedMap;
}

std::string childPath(const std::string &parent, const std::string &name) {
  return parent == "/" ? "/" + name : parent + "/" + name;
}

class WadDocument {
 public:
  explicit WadDocument(std::string filePath) : filePath_(std::move(filePath)) {
    load();
    buildTree();
  }

  const std::string &magic() const { return magic_; }
  std::uint32_t descriptorCount() const { return descriptorCount_; }
  std::uint32_t descriptorOffset() const { return descriptorOffset_; }
  std::uint64_t fileSize() const { return fileSize_; }
  const std::vector<Entry> &entries() const { return entries_; }

  const Entry &requireEntry(const std::string &path) const {
    const auto found = entryByPath_.find(normalizePath(path));
    if (found == entryByPath_.end()) {
      throw std::runtime_error("WAD path does not exist: " + path);
    }
    return entries_[found->second];
  }

  void readContent(const Entry &entry, const std::string &outputPath) const {
    if (entry.kind != "content") {
      throw std::runtime_error("WAD path is not content: " + entry.path);
    }

    std::ifstream input(filePath_, std::ios::binary);
    std::ofstream output(outputPath, std::ios::binary | std::ios::trunc);
    if (!input || !output) {
      throw std::runtime_error("Unable to open content input or output file");
    }

    input.seekg(entry.offset);
    std::vector<char> buffer(std::min<std::uint32_t>(entry.length, 64 * 1024));
    std::uint32_t remaining = entry.length;

    while (remaining > 0) {
      const auto amount = std::min<std::uint32_t>(remaining, buffer.size());
      input.read(buffer.data(), amount);
      if (input.gcount() != static_cast<std::streamsize>(amount)) {
        throw std::runtime_error("Unable to read complete WAD content");
      }
      output.write(buffer.data(), amount);
      remaining -= amount;
    }
  }

 private:
  std::string filePath_;
  std::string magic_;
  std::uint32_t descriptorCount_ = 0;
  std::uint32_t descriptorOffset_ = 0;
  std::uint64_t fileSize_ = 0;
  std::vector<Descriptor> descriptors_;
  std::vector<Entry> entries_;
  std::unordered_map<std::string, std::size_t> entryByPath_;

  static std::string normalizePath(std::string path) {
    if (path.empty()) return "/";
    if (path.front() != '/') path.insert(path.begin(), '/');
    while (path.size() > 1 && path.back() == '/') path.pop_back();
    return path;
  }

  void load() {
    fileSize_ = std::filesystem::file_size(filePath_);
    if (fileSize_ < 12) {
      throw std::runtime_error("WAD is smaller than its 12-byte header");
    }

    std::ifstream file(filePath_, std::ios::binary);
    if (!file) throw std::runtime_error("Unable to open WAD file");

    unsigned char header[12];
    file.read(reinterpret_cast<char *>(header), sizeof(header));
    if (file.gcount() != static_cast<std::streamsize>(sizeof(header))) {
      throw std::runtime_error("Unable to read WAD header");
    }

    magic_ = std::string(reinterpret_cast<char *>(header), 4);
    if (magic_ != "IWAD" && magic_ != "PWAD") {
      throw std::runtime_error("WAD magic must be IWAD or PWAD");
    }

    descriptorCount_ = readUint32(header + 4);
    descriptorOffset_ = readUint32(header + 8);
    const std::uint64_t tableSize = static_cast<std::uint64_t>(descriptorCount_) * 16;
    if (descriptorOffset_ > fileSize_ || tableSize > fileSize_ - descriptorOffset_) {
      throw std::runtime_error("WAD descriptor table extends beyond end of file");
    }

    file.seekg(descriptorOffset_);
    descriptors_.reserve(descriptorCount_);

    for (std::uint32_t index = 0; index < descriptorCount_; ++index) {
      unsigned char raw[16];
      file.read(reinterpret_cast<char *>(raw), sizeof(raw));
      if (file.gcount() != static_cast<std::streamsize>(sizeof(raw))) {
        throw std::runtime_error("Unable to read complete WAD descriptor table");
      }

      Descriptor descriptor{
          readUint32(raw),
          readUint32(raw + 4),
          std::string(reinterpret_cast<char *>(raw + 8), 8),
      };
      const auto terminator = descriptor.name.find('\0');
      if (terminator != std::string::npos) descriptor.name.resize(terminator);
      if (descriptor.name.empty()) {
        throw std::runtime_error("WAD descriptor has an empty name");
      }

      const std::uint64_t contentEnd =
          static_cast<std::uint64_t>(descriptor.offset) + descriptor.length;
      if (descriptor.length > 0 && contentEnd > fileSize_) {
        throw std::runtime_error("WAD content extends beyond end of file: " + descriptor.name);
      }
      descriptors_.push_back(std::move(descriptor));
    }
  }

  std::size_t addEntry(Entry entry, std::size_t parent) {
    if (entryByPath_.count(entry.path) != 0) {
      throw std::runtime_error("WAD produces a duplicate virtual path: " + entry.path);
    }
    const auto index = entries_.size();
    entries_.push_back(std::move(entry));
    entryByPath_[entries_[index].path] = index;
    entries_[parent].children.push_back(index);
    return index;
  }

  void buildTree() {
    entries_.push_back(Entry{"root", "/", "/", 0, 0, {}});
    entryByPath_["/"] = 0;
    std::vector<std::size_t> namespaceStack{0};

    for (std::size_t index = 0; index < descriptors_.size(); ++index) {
      const auto &descriptor = descriptors_[index];
      const auto parent = namespaceStack.back();
      const auto &parentPath = entries_[parent].path;

      if (endsWith(descriptor.name, "_START")) {
        const auto name = descriptor.name.substr(0, descriptor.name.size() - 6);
        if (name.empty()) throw std::runtime_error("Namespace marker has no name");
        const auto directory = addEntry(
            Entry{"namespace", name, childPath(parentPath, name), 0, 0, {}},
            parent);
        namespaceStack.push_back(directory);
        continue;
      }

      if (endsWith(descriptor.name, "_END")) {
        const auto name = descriptor.name.substr(0, descriptor.name.size() - 4);
        if (namespaceStack.size() == 1 || entries_[namespaceStack.back()].name != name) {
          throw std::runtime_error("Unmatched namespace end marker: " + descriptor.name);
        }
        namespaceStack.pop_back();
        continue;
      }

      if (isMapMarker(descriptor.name)) {
        if (index + 10 >= descriptors_.size()) {
          throw std::runtime_error("Map marker does not have ten following lumps: " + descriptor.name);
        }
        const auto map = addEntry(
            Entry{"map", descriptor.name, childPath(parentPath, descriptor.name),
                  0, 0, {}},
            parent);

        for (std::size_t childIndex = 1; childIndex <= 10; ++childIndex) {
          const auto &child = descriptors_[index + childIndex];
          addEntry(
              Entry{"content", child.name, childPath(entries_[map].path, child.name),
                    child.offset, child.length, {}},
              map);
        }
        index += 10;
        continue;
      }

      addEntry(
          Entry{"content", descriptor.name, childPath(parentPath, descriptor.name),
                descriptor.offset, descriptor.length, {}},
          parent);
    }

    if (namespaceStack.size() != 1) {
      throw std::runtime_error("WAD contains an unclosed namespace marker");
    }
  }
};

void printEntry(const Entry &entry) {
  std::cout << "{\"kind\":\"" << jsonEscape(entry.kind)
            << "\",\"name\":\"" << jsonEscape(entry.name)
            << "\",\"path\":\"" << jsonEscape(entry.path) << "\"";
  if (entry.kind == "content") {
    std::cout << ",\"offset\":" << entry.offset << ",\"sizeBytes\":" << entry.length;
  } else {
    std::cout << ",\"childrenCount\":" << entry.children.size();
  }
  std::cout << "}";
}

void printTreeEntry(const WadDocument &document, std::size_t index) {
  const auto &entry = document.entries()[index];
  std::cout << "{\"entry\":";
  printEntry(entry);
  std::cout << ",\"children\":[";
  for (std::size_t child = 0; child < entry.children.size(); ++child) {
    if (child > 0) std::cout << ',';
    printTreeEntry(document, entry.children[child]);
  }
  std::cout << "]}";
}

int run(int argc, char **argv) {
  if (argc < 3) {
    throw std::runtime_error("Usage: wadctl <inspect|validate|tree|list|stat|read> <wad> [args]");
  }

  const std::string command = argv[1];
  WadDocument document(argv[2]);

  if (command == "inspect" || command == "validate") {
    std::cout << "{\"valid\":true,\"magic\":\"" << document.magic()
              << "\",\"descriptorCount\":" << document.descriptorCount()
              << ",\"descriptorOffset\":" << document.descriptorOffset()
              << ",\"fileSizeBytes\":" << document.fileSize() << "}\n";
    return 0;
  }

  if (command == "tree") {
    printTreeEntry(document, 0);
    std::cout << '\n';
    return 0;
  }

  if (command == "list") {
    if (argc < 4) throw std::runtime_error("list requires a virtual WAD path");
    const auto &entry = document.requireEntry(argv[3]);
    if (entry.kind == "content") throw std::runtime_error("WAD path is not a directory");
    std::cout << "{\"path\":\"" << jsonEscape(entry.path) << "\",\"entries\":[";
    for (std::size_t child = 0; child < entry.children.size(); ++child) {
      if (child > 0) std::cout << ',';
      printEntry(document.entries()[entry.children[child]]);
    }
    std::cout << "]}\n";
    return 0;
  }

  if (command == "stat") {
    if (argc < 4) throw std::runtime_error("stat requires a virtual WAD path");
    printEntry(document.requireEntry(argv[3]));
    std::cout << '\n';
    return 0;
  }

  if (command == "read") {
    if (argc < 5) throw std::runtime_error("read requires a virtual path and output path");
    document.readContent(document.requireEntry(argv[3]), argv[4]);
    std::cout << "{\"written\":true,\"outputPath\":\""
              << jsonEscape(argv[4]) << "\"}\n";
    return 0;
  }

  throw std::runtime_error("Unknown wadctl command: " + command);
}

}  // namespace

int main(int argc, char **argv) {
  try {
    return run(argc, argv);
  } catch (const std::exception &error) {
    std::cerr << "{\"error\":\"" << jsonEscape(error.what()) << "\"}\n";
    return 1;
  }
}
