import type { SecondB } from "@tests/b";
import type { ThirdC } from "@tests/c";

export type Data = {
  hello: "world";
  meta: SecondB;
  other: ThirdC;
};
