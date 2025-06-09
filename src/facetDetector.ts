import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Groq } from 'groq-sdk';
import { Facets } from './dto/dto';
import { productsJsonUrl } from './config/urls';
import { exit } from 'process';

dotenv.config();
const GroqApiKey = process.env.GROQ_API_KEY;

const normalizationMap: Record<string, string> = {
  "mens": "men",
  "man": "men",
  "male": "men",
  "men’s": "men",
  "menswear": "men",
  "womens": "women",
  "women": "women",
  "female": "women",
  "women's": "women",
  "woman-specific": "women",
  "women-specific": "women",
  "unisex": "unisex",
  "junior": "junior"
};

// Normalize individual facet strings using the above map
function normalizeString(value: string): string {
  const cleaned = value.trim().toLowerCase();
  return normalizationMap[cleaned] || value;
}

// Normalize parsed JSON object by normalizing keys and values
// This function will recursively traverse the object and apply normalization
// to all string values and keys, converting them to lowercase and replacing spaces with underscores.
// It will also handle arrays and nested objects.
function normalizeParsedJSON(obj: any): any {

  function normalize(value: any): any {
    if (typeof value === "string") {
      const cleaned = value.trim().toLowerCase();
      return normalizationMap[cleaned] || value.trim();
    }

    if (Array.isArray(value)) {
      return value.map(normalize);
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const result: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, "_");
        result[normalizedKey] = normalize(val);
      }
      return result;
    }

    return value;
  }

  return normalize(obj);
}

// Read a JSON file and parse its content
// If the file does not exist or is not valid JSON, it will log an error and exit the process.
function readJsonFile(filePath: string): Record<string, any> {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading JSON file at ${filePath}:`, error);
    exit(1);
  }
}

// Extract easily detectable facets from product data and write them to an output file
async function facetDetector(filePath: string, outputFilePath: string): Promise<void> {
    const productFacets: Record<string, Facets> = {};
    const data = readJsonFile(filePath);
    // const products = JSON.parse(data?.data.content).products;
    const products = Array.isArray(data) ? data : [data];

    for (const product of products) {
        const facets: Facets = {};
        facets["title"] = product.title;

        for (const tag of product.tags) {
            const [key, value] = tag.split(":");
            if (value) {
                const normalizedKey = normalizeString(key);
                const normalizedValue = normalizeString(value);
                if (!facets[normalizedKey]) {
                    facets[normalizedKey] = [];
                }
                // @ts-ignore
                if (Array.isArray(facets[normalizedKey]) && !facets[normalizedKey].includes(normalizedValue)) {
                    (facets[normalizedKey] as string[]).push(normalizedValue);
                }
            }
        }
        
        facets["vendor"] = product.vendor;
        facets["product_type"] = normalizeString(product.product_type);

        for (const variant of product.variants) {

            if (variant.option1 && variant.option1 !== "Default Title") {
                const normalizeKey = normalizeString(product.options[0].name);
                if (!facets[normalizeKey]) {
                    facets[normalizeKey] = [];
                }
                const normalizedOption1 = normalizeString(variant.option1);
                if (!facets[normalizeKey].includes(normalizedOption1)) {
                    (facets[normalizeKey] as string[]).push(normalizedOption1);
                }
            }
            if (variant.option2) {
                const normalizeKey = normalizeString(product.options[1].name);
                if (!facets[normalizeKey]) {
                    facets[normalizeKey] = [];
                }
                const normalizedOption2 = normalizeString(variant.option2);
                if (!facets[normalizeKey].includes(normalizedOption2)) {
                    (facets[normalizeKey] as string[]).push(normalizedOption2);
                }
            }
            if (variant.option3) {
                const normalizeKey = normalizeString(product.options[2].name);
                if (!facets[normalizeKey]) {
                    facets[normalizeKey] = [];
                }
                const normalizedOption3 = normalizeString(variant.option3);
                if (!facets[normalizeKey].includes(normalizedOption3)) {
                    (facets[normalizeKey] as string[]).push(normalizedOption3);
                }
            }
            if (variant.price) {
                const price = variant.price.toString();
                if (!facets["price"]) {
                    facets["price"] = [];
                }
                if (!facets["price"].includes(price)) {
                    (facets["price"] as string[]).push(price);
                }
            }
            if (variant.compare_at_price) {
                if (!facets["compare_at_price"]) {
                    facets["compare_at_price"] = [];
                }
                const compareAtPrice = variant.compare_at_price.toString();
                if (!facets["compare_at_price"].includes(compareAtPrice)) {
                    (facets["compare_at_price"] as string[]).push(compareAtPrice);
                }
            }
            if (variant.grams) {
                if (!facets["grams"]) {
                    facets["grams"] = [];
                }
                const grams = variant.grams.toString();
                if (!facets["grams"].includes(grams)) {
                    (facets["grams"] as string[]).push(grams);
                }
            }
            if (variant.available) {
                if (!facets["available"]) {
                    facets["available"] = [];
                }
                const available = variant.available.toString();
                if (!facets["available"].includes(available)) {
                    (facets["available"] as string[]).push(available);
                }
            }
        }
        const bodyFacet = await llmFacetDetector(JSON.stringify(product.body_html));
        productFacets[product.id] = { ...facets, ...bodyFacet };
    }
    fs.writeFileSync(outputFilePath, JSON.stringify(productFacets, null, 2), 'utf-8');
}

// Use Groq and Gemma 9B Instruct model to detect facets from the HTML body of a product
async function llmFacetDetector(htmlBody: string): Promise<Record<string, string[]>> {
    const groq = new Groq({apiKey: GroqApiKey});
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `
                    Your task is to identify product data facets from the given HTML body.
                    Example data facet is like - for skiing products, measurements and specifications can be considered data facet.
                    For clothing - data facet can be like cushion, insulation type, season etc.
                    The output should be in the form:
                    \`\`\`
                    {
                    key: property value
                    key: [property value]
                    }
                    \`\`\`
                `
                },
                {
                    role: "user",
                    content: `
                    Extract all facet data and value in JSON format from html body: ${htmlBody}
                    `
                }
            ],
            model: "gemma2-9b-it",
            max_tokens: 1024,
            temperature: 1,
            top_p: 1,
            stream: false,
            response_format: {
                type: "json_object",
            },
            stop: null
        })
        const content = chatCompletion.choices[0].message.content;
        return content ? normalizeParsedJSON(JSON.parse(content)) : {};
    } catch (error) {
        console.error("Error in Groq chat completion");
        return {};
    }
    
}

async function fetchAndProcessProducts() {
    for (const key of Object.keys(productsJsonUrl)) {
        const filePath = `src/data/${key}.json`;
        const outputFilePath = `src/facetDB/${key}.json`;
        console.log(`Processing ${key}...`);
        await facetDetector(filePath, outputFilePath);
    }
}

fetchAndProcessProducts();
// facetDetector('src/data/libertySkis_test.json', 'src/facetDB/libertySkis.json')
