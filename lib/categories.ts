import type { CategoryId } from "@/lib/types";

/*
  Sorting the shopping list into shop aisles, so you walk through the shop once.
  categorize("Full cream milk") → "dairy". It looks for known words (singular or plural),
  including South African favourites like boerewors, mielie meal, rooibos and Ouma rusks.
  Anything it doesn't know goes under "Other", and you can still find it at the bottom.
*/

export type Category = { id: CategoryId; label: string; colour: string };

// In the order you'd usually meet them in a South African supermarket
export const CATEGORIES: Category[] = [
  { id: "fresh", label: "Fruit & veg", colour: "#3f8f4f" },
  { id: "bakery", label: "Bakery", colour: "#c0812b" },
  { id: "dairy", label: "Dairy & eggs", colour: "#4a7fb8" },
  { id: "meat", label: "Meat & fish", colour: "#b8473f" },
  { id: "pantry", label: "Pantry", colour: "#9a6b3c" },
  { id: "frozen", label: "Frozen", colour: "#3c8ea0" },
  { id: "drinks", label: "Drinks", colour: "#7a5aa6" },
  { id: "snacks", label: "Snacks & sweets", colour: "#c25a87" },
  { id: "household", label: "Cleaning & household", colour: "#5b7083" },
  { id: "care", label: "Toiletries & pharmacy", colour: "#3f9a8a" },
  { id: "baby", label: "Baby", colour: "#d08a52" },
  { id: "pets", label: "Pets", colour: "#8a7a3c" },
  { id: "other", label: "Other", colour: "#7a7a7a" },
];

const WORDS: Record<Exclude<CategoryId, "other">, string[]> = {
  fresh: [
    "apple", "banana", "orange", "naartjie", "lemon", "lime", "grape", "pear", "peach", "plum", "mango", "pineapple", "avocado", "avo",
    "strawberry", "berry", "blueberry", "melon", "watermelon", "spanspek", "kiwi", "litchi", "guava", "pawpaw", "papaya", "fruit",
    "tomato", "potato", "onion", "garlic", "ginger", "carrot", "cabbage", "lettuce", "spinach", "broccoli", "cauliflower", "butternut",
    "pumpkin", "gem squash", "squash", "baby marrow", "courgette", "zucchini", "cucumber", "pepper", "chilli", "mushroom", "beetroot",
    "sweet potato", "mielie", "corn", "green bean", "bean sprout", "pea", "celery", "herb", "coriander", "dhania", "parsley", "basil",
    "mint", "salad", "veg", "vegetable", "rocket", "kale",
  ],
  bakery: ["bread", "loaf", "roll", "bun", "vetkoek", "croissant", "muffin", "scone", "wrap", "tortilla", "pita", "bagel", "cake", "baguette", "rusk", "koeksister"],
  dairy: [
    "milk", "maas", "amasi", "butter", "margarine", "rama", "cheese", "cheddar", "gouda", "feta", "mozzarella", "yoghurt", "yogurt",
    "cream", "sour cream", "cottage cheese", "egg", "custard", "inkomazi",
  ],
  meat: [
    "chicken", "beef", "mince", "steak", "lamb", "mutton", "pork", "bacon", "ham", "sausage", "boerewors", "wors", "russian", "viennas",
    "vienna", "polony", "biltong", "droewors", "fish", "hake", "snoek", "tuna steak", "salmon", "prawn", "calamari", "chop", "ribs",
    "drumstick", "wing", "thigh", "fillet", "meat", "gizzard", "livers", "tripe", "mogodu",
  ],
  pantry: [
    "rice", "pasta", "spaghetti", "macaroni", "noodle", "maggi", "flour", "cake flour", "sugar", "salt", "oil", "sunflower oil",
    "olive oil", "vinegar", "mielie meal", "maize meal", "pap", "samp", "oats", "jungle oats", "cereal", "cornflakes", "weet-bix",
    "weetbix", "pronutro", "tea", "rooibos", "coffee", "ricoffy", "jam", "peanut butter", "honey", "syrup", "tin", "tinned", "can",
    "baked bean", "chakalaka", "tomato sauce", "all gold", "mayonnaise", "mayo", "chutney", "mrs balls", "atchar", "spice", "curry",
    "masala", "aromat", "stock", "oxo", "knorr", "soup", "lentil", "bean", "split pea", "yeast", "baking powder", "cocoa", "pilchard",
    "tuna", "tinned tomato", "chopped tomato", "tomato paste", "sauce", "ketchup", "mustard", "breakfast", "bisto", "gravy",
  ],
  frozen: ["frozen", "ice cream", "ice", "fish finger", "oven chips", "frozen chips", "frozen veg", "peas and carrots", "ice lolly"],
  drinks: [
    "juice", "water", "sparkling", "cooldrink", "cold drink", "soda", "coke", "fanta", "sprite", "stoney", "creme soda", "iron brew",
    "appletiser", "grapetiser", "oros", "cordial", "energy drink", "beer", "wine", "cider", "milo", "hot chocolate",
  ],
  snacks: ["chocolate", "sweet", "candy", "chip", "crisps", "simba", "nik nak", "biscuit", "cookie", "popcorn", "nuts", "peanut", "lunch bar", "bar one", "rusks", "ouma", "snack", "gum"],
  household: [
    "toilet paper", "toilet roll", "loo roll", "paper towel", "serviette", "tissue", "dishwashing", "sunlight liquid", "dish soap",
    "washing powder", "omo", "fabric softener", "sta-soft", "bleach", "jik", "handy andy", "cleaner", "sponge", "steel wool",
    "bin bag", "refuse bag", "black bag", "cling wrap", "foil", "battery", "batteries", "light bulb", "globe", "candle", "matches",
    "doom", "insect spray", "air freshener", "detergent", "polish",
  ],
  care: [
    "toothpaste", "toothbrush", "floss", "mouthwash", "shampoo", "conditioner", "soap", "body wash", "lotion", "vaseline",
    "deodorant", "roll-on", "razor", "shaving", "sanitary", "pad", "tampon", "plaster", "panado", "paracetamol", "medicine",
    "vitamin", "sunscreen", "sunblock", "cotton wool", "earbud", "hand wash", "sanitiser", "sanitizer",
  ],
  baby: ["nappy", "nappies", "diaper", "wipes", "formula", "purity", "baby food", "baby"],
  pets: ["dog food", "cat food", "pet food", "cat litter", "litter", "dog", "cat", "pet", "bird seed"],
};

// Longer phrases first, so "peanut butter" wins over "butter" and "cat food" over "food"
const PHRASES = (Object.entries(WORDS) as [CategoryId, string[]][])
  .flatMap(([id, words]) => words.map((w) => ({ id, w })))
  .sort((a, b) => b.w.length - a.w.length);

/** "Strawberries" → "strawberry", "tomatoes" → "tomato", "loaves" → "loaf" (good enough for matching) */
function singular(word: string) {
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (word.endsWith("ves") && word.length > 4) return word.slice(0, -3) + "f";
  if (word.endsWith("oes") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

export function categorize(text: string): CategoryId {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const plain = ` ${words.join(" ")} `;
  const single = ` ${words.map(singular).join(" ")} `;
  for (const { id, w } of PHRASES) {
    if (plain.includes(` ${w} `) || single.includes(` ${w} `)) return id;
  }
  return "other";
}

export function categoryInfo(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
