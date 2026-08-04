import { describe, expect, it } from "vitest";
import {
  buildListHref,
  getPageParam,
  getPageRange,
  getParam,
  quoteFilterValue,
} from "./admin-query";

describe("getParam", () => {
  it("returns the string value for a simple param", () => {
    expect(getParam({ q: "hola" }, "q")).toBe("hola");
  });

  it("returns the first value when the param is an array", () => {
    expect(getParam({ q: ["a", "b"] }, "q")).toBe("a");
  });

  it("returns undefined for a missing param", () => {
    expect(getParam({}, "q")).toBeUndefined();
    expect(getParam(undefined, "q")).toBeUndefined();
  });
});

describe("getPageParam", () => {
  it("defaults to page 1 when missing or invalid", () => {
    expect(getPageParam(undefined)).toBe(1);
    expect(getPageParam({ page: "abc" })).toBe(1);
    expect(getPageParam({ page: "0" })).toBe(1);
    expect(getPageParam({ page: "-3" })).toBe(1);
  });

  it("parses a valid page number", () => {
    expect(getPageParam({ page: "5" })).toBe(5);
  });

  it("floors non-integer page numbers", () => {
    expect(getPageParam({ page: "3.7" })).toBe(3);
  });

  it("supports a custom param key", () => {
    expect(getPageParam({ eventsPage: "2" }, "eventsPage")).toBe(2);
  });
});

describe("getPageRange", () => {
  it("computes the zero-indexed from/to range for a page", () => {
    expect(getPageRange(1, 10)).toEqual({ from: 0, to: 9 });
    expect(getPageRange(2, 10)).toEqual({ from: 10, to: 19 });
    expect(getPageRange(3, 9)).toEqual({ from: 18, to: 26 });
  });
});

describe("buildListHref", () => {
  it("returns the bare pathname when there are no params", () => {
    expect(buildListHref("/admin/eventos", {})).toBe("/admin/eventos");
  });

  it("omits undefined/empty params", () => {
    expect(
      buildListHref("/admin/eventos", { q: undefined, status: "" })
    ).toBe("/admin/eventos");
  });

  it("appends only the defined params as a query string", () => {
    const href = buildListHref("/admin/eventos", {
      q: "retiro",
      status: "draft",
      page: undefined,
    });

    expect(href).toBe("/admin/eventos?q=retiro&status=draft");
  });
});

describe("quoteFilterValue", () => {
  it("wraps a plain value in double quotes", () => {
    expect(quoteFilterValue("%hola%")).toBe('"%hola%"');
  });

  it("keeps commas and periods literal instead of letting them act as filter separators", () => {
    // Without quoting, this would be parsed by PostgREST as two extra
    // conditions (",status.eq.published") instead of one literal value.
    expect(quoteFilterValue("%x,status.eq.published%")).toBe(
      '"%x,status.eq.published%"'
    );
  });

  it("escapes embedded double quotes so they can't close the value early", () => {
    expect(quoteFilterValue('%a"b%')).toBe('"%a\\"b%"');
  });

  it("escapes backslashes before quoting so escaping itself can't be spoofed", () => {
    expect(quoteFilterValue("%a\\b%")).toBe('"%a\\\\b%"');
  });
});
