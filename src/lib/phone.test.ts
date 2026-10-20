import {describe,it,expect} from "vitest";
import {normalizeIndianMobile} from "./phone";
describe("Indian mobile numbers",()=>{it("normalizes a ten digit number",()=>expect(normalizeIndianMobile("98765 43210")).toBe("+919876543210"));it("normalizes a +91 number",()=>expect(normalizeIndianMobile("+91 98765 43210")).toBe("+919876543210"));it("rejects invalid prefixes and lengths",()=>{expect(normalizeIndianMobile("5123456789")).toBeNull();expect(normalizeIndianMobile("987654321")).toBeNull()})});
