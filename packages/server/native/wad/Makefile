CXX ?= c++
CXXFLAGS ?= -std=c++17 -O2 -Wall -Wextra -Wpedantic

.PHONY: all clean

all: wadctl

wadctl: wadctl.cpp
	$(CXX) $(CXXFLAGS) wadctl.cpp -o wadctl

clean:
	rm -f wadctl
