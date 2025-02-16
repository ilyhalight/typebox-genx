import type { Two, Fake } from "./two";
import type { RequestMethod } from "@toil/translate/types/providers/base";

type Status = "success" | "error";

export type One = {
  name: string;
};

export type OneExtra = One & {
  status: Status;
  data: Two;
  extra: "static";
};

export const test = "123";
export const test2 = ["123", "43"];

export type MegaTest = {
  test: (typeof test2)[number];
  fake: Fake;
  method: RequestMethod;
};
