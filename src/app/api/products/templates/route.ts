import { NextResponse } from "next/server";

export interface ProductTemplateItem {
  name: string;
  category: string;
  costPrice: number;
  sellPrice: number;
}

export interface ProductTemplate {
  id: string;
  name: string;
  category: string;
  products: ProductTemplateItem[];
}

// Hardcoded templates for Kaffee-Klassiker, Gebäck-Basics, Lunch-Menü
const TEMPLATES: ProductTemplate[] = [
  {
    id: "kaffee-klassiker",
    name: "Kaffee-Klassiker",
    category: "coffee",
    products: [
      { name: "Espresso", category: "coffee", costPrice: 0.25, sellPrice: 2.2 },
      { name: "Caffè Americano", category: "coffee", costPrice: 0.3, sellPrice: 2.8 },
      { name: "Cappuccino", category: "coffee", costPrice: 0.45, sellPrice: 3.5 },
      { name: "Latte Macchiato", category: "coffee", costPrice: 0.5, sellPrice: 4.2 },
      { name: "Flat White", category: "coffee", costPrice: 0.5, sellPrice: 4.2 },
      { name: "Caffè Latte", category: "coffee", costPrice: 0.45, sellPrice: 3.9 },
      { name: "Espresso Macchiato", category: "coffee", costPrice: 0.3, sellPrice: 2.5 },
      { name: "Cortado", category: "coffee", costPrice: 0.35, sellPrice: 3.2 },
    ],
  },
  {
    id: "geback-basics",
    name: "Gebäck-Basics",
    category: "bakery",
    products: [
      { name: "Croissant", category: "bakery", costPrice: 0.9, sellPrice: 2.8 },
      { name: "Croissant mit Schoko", category: "bakery", costPrice: 1.0, sellPrice: 3.2 },
      { name: "Mohnbrötchen", category: "bakery", costPrice: 0.5, sellPrice: 1.8 },
      { name: "Körniger Frischkäse", category: "bakery", costPrice: 0.6, sellPrice: 2.2 },
      { name: "Buttercroissant", category: "bakery", costPrice: 0.95, sellPrice: 2.9 },
      { name: "Schokocroissant", category: "bakery", costPrice: 1.1, sellPrice: 3.5 },
      { name: "Apfeltasche", category: "bakery", costPrice: 0.7, sellPrice: 2.5 },
      { name: "Baguette klein", category: "bakery", costPrice: 0.8, sellPrice: 2.2 },
    ],
  },
  {
    id: "lunch-menue",
    name: "Lunch-Menü",
    category: "lunch",
    products: [
      { name: "Club Sandwich", category: "lunch", costPrice: 2.5, sellPrice: 8.9 },
      { name: "Caesar Salad", category: "lunch", costPrice: 2.2, sellPrice: 9.5 },
      { name: "Quiche Lorraine", category: "lunch", costPrice: 1.8, sellPrice: 7.5 },
      { name: "Suppe des Tages", category: "lunch", costPrice: 1.2, sellPrice: 5.9 },
      { name: "Pasta Tagliatelle", category: "lunch", costPrice: 2.0, sellPrice: 8.5 },
      { name: "Wrap vegetarisch", category: "lunch", costPrice: 1.5, sellPrice: 6.9 },
      { name: "Bagel mit Frischkäse", category: "lunch", costPrice: 1.0, sellPrice: 4.5 },
    ],
  },
];

export async function GET() {
  try {
    return NextResponse.json(TEMPLATES);
  } catch (error) {
    console.error("Product templates GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}
