export type GenerateNumberRange<Min extends number, Max extends number> = {
  [K in Min | Max]: K;
};
