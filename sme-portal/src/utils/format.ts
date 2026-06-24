export const formatZAR = (value: number | string): string => {
  const formatted = new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));

  let result = formatted.replace(/\u00a0/g, " ").trim();
  if (result.startsWith("R") && !result.startsWith("R ")) {
    result = "R " + result.substring(1);
  }
  return result;
};