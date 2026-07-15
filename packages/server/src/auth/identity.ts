export type SessionIdentity = {
  kind: "guest" | "authenticated";
  id: string;
};
