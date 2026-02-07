/* eslint-disable no-undef */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CsvUtils = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  const defaultEol = (() => {
    try {
      return require("os").EOL;
    } catch {
      return "\n";
    }
  })();

  function formatCsvExport(payload, eol = defaultEol) {
    const rows = [["path", "value"]];
    const flatten = (value, prefix = "") => {
      if (Array.isArray(value)) {
        if (!value.length) {
          rows.push([prefix, ""]);
          return;
        }
        value.forEach((item, index) => {
          const nextPrefix = prefix ? `${prefix}[${index}]` : String(index);
          if (item && typeof item === "object") {
            flatten(item, nextPrefix);
          } else {
            rows.push([nextPrefix, item ?? ""]);
          }
        });
        return;
      }
      if (value && typeof value === "object") {
        Object.keys(value).forEach((key) => flatten(value[key], prefix ? `${prefix}.${key}` : key));
        return;
      }
      rows.push([prefix, value ?? ""]);
    };
    flatten(payload);
    return rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join(eol);
  }

  return { formatCsvExport };
});
