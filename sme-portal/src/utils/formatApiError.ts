export function formatApiErrorDetail(detail: any): string {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((el) => {
        if (!el) return "";
        if (typeof el === "string") return el;
        if (typeof el === "object") {
          if (el.msg) {
            const loc = el.loc ? (Array.isArray(el.loc) ? el.loc.join(".") : String(el.loc)) : null;
            return loc ? `${loc}: ${el.msg}` : el.msg;
          }
          if (el.message) return el.message;
          return JSON.stringify(el);
        }
        return String(el);
      })
      .filter(Boolean)
      .join("; ");
  }
  if (typeof detail === "object") {
    if ((detail as any).message) return (detail as any).message;
    try {
      return Object.entries(detail)
        .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
        .join("; ");
    } catch (e) {
      return JSON.stringify(detail);
    }
  }

  return String(detail);
}

export default formatApiErrorDetail;
