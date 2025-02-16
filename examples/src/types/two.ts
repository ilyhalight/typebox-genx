export type TwoChildren = {
  b: number;
};

export type Two = {
  a: number;
  data: TwoChildren;
};

export type Fake = {
  content: string;
};

export const fake = "asdasd" as const;

export default {
  content: "failed",
};
