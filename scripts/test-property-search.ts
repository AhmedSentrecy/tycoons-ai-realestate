import assert from "node:assert/strict";
import { inventoryStats, loadInventory, type InventoryUnit } from "../src/lib/inventory.ts";
import {
  parseSearchQuery,
  searchInventory,
  type RankedInventoryUnit,
  type SearchOutput,
} from "../src/lib/propertySearch.ts";
import { buildUnitWhatsAppMessage } from "../src/lib/whatsapp.ts";

function fixture(overrides: Partial<InventoryUnit>): InventoryUnit {
  return {
    project_name: "Test Project",
    developer: "Test Developer",
    location: "North Coast",
    unit_type: "Chalet",
    bedrooms_text: "2 bedrooms",
    area_sqm: 110,
    starting_price: 18_000_000,
    down_payment_text: "5%",
    installments_text: "8 years",
    delivery_text: "Delivery in 2 years",
    finishing: "Fully Finished",
    availability_status: "available",
    description: "",
    image_url: "https://example.com/image.jpg",
    gallery_urls: "",
    brochure_url: "https://example.com/brochure.pdf",
    video_url: "",
    last_updated_at: "2026-07-26",
    images: ["https://example.com/image.jpg"],
    ...overrides,
  };
}

function completeMatches(output: SearchOutput): RankedInventoryUnit[] {
  return [...output.exact, ...output.alternatives.filter((item) => item.differences.length === 0)];
}

async function run() {
  const parsed = parseSearchQuery("عايز آي فيلا في التجمع 3 غرف تحت 20 مليون وتقسيط 8 سنين");
  assert.equal(parsed.unitType, "iVilla");
  assert.equal(parsed.bedrooms, 3);
  assert.equal(parsed.budgetMax, 20_000_000);
  assert.equal(parsed.installmentsYearsMin, 8);
  assert.ok(parsed.regionTerms.length > 0);

  const controlled = searchInventory(
    [
      fixture({ starting_price: 9_000_000, delivery_text: "Immediate delivery" }),
      fixture({ project_name: "Over Budget", starting_price: 18_000_000 }),
    ],
    "chalet north coast under 10 million",
  );
  assert.equal(controlled.totalExact, 1);
  assert.equal(controlled.exact[0]?.unit.starting_price, 9_000_000);
  assert.ok(
    controlled.alternatives.some((result) =>
      result.differences.some((item) => item.includes("أعلى من الميزانية")),
    ),
  );

  const message = buildUnitWhatsAppMessage(
    fixture({ project_name: "Mountain View Aliva" }),
    "آي فيلا في التجمع",
    "https://tycoons-inv.de/",
  );
  assert.match(message, /Source: ai_search_result/);
  assert.match(message, /Tracking ID: wa_/);
  assert.match(message, /Search request: آي فيلا في التجمع/);
  assert.match(message, /Brochure:/);

  const units = await loadInventory(true);
  const stats = inventoryStats(units);
  assert.ok(stats.units > 100, `Expected live inventory, received ${stats.units}`);
  assert.ok(stats.projects > 50, `Expected live projects, received ${stats.projects}`);

  const aliva = searchInventory(units, "Mountain View Aliva");
  assert.ok(aliva.totalExact > 0, "Mountain View Aliva should return exact live results");
  assert.ok(aliva.exact.some((result) => /aliva/i.test(result.unit.project_name)));

  const ivilla = completeMatches(searchInventory(units, "آي فيلا في التجمع 3 غرف"));
  assert.ok(ivilla.length > 0, "iVilla Arabic query should return complete structured matches");
  assert.ok(ivilla.every((result) => /ivilla/i.test(result.unit.unit_type)));

  const budget = completeMatches(searchInventory(units, "شقة تحت 7 مليون"));
  assert.ok(budget.every((result) => result.unit.starting_price <= 7_000_000));

  console.log(
    `Property search tests passed: ${stats.units} units, ${stats.projects} projects, ${stats.developers} developers`,
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
