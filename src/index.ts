import { Command } from 'commander';
import fs from 'fs';
import { Product } from './dto/dto';

const program = new Command();

program
    .name('facet-detector')
    .description('CLI tool to detect facets from product data')
    .requiredOption('--vendor <vendor>', 'Vendor name to filter products. Valid vendor names: LibertySkis, WildRye, DarnTough, PearlIzumi, PepperHome, ShopHomeMed')
    .option('-f, --facet <facet...>', 'Facet to filter products')
    .option('-v, --facet-value <facetValue...>', 'Facet-value to filter products')
    .option('--save <fileName>', 'Save the output to a file');

program.parse();
const { vendor, facet, facetValue, save } = program.opts();

const facets: string[] = Array.isArray(facet) ? facet : (facet ? [facet] : []);
const values: string[] = Array.isArray(facetValue) ? facetValue : (facetValue ? [facetValue] : []);

// Map vendor names to corresponding local JSON file paths
const vendorMap: Record<string, string> = {
    'LibertySkis': 'src/facetDB/libertySkis.json',
    'WildRye': 'src/facetDB/wildRye.json',
    'DarnTough': 'src/facetDB/darnTough.json',
    'PearlIzumi': 'src/facetDB/pearlIzumi.json',
    'PepperHome': 'src/facetDB/pepperHome.json',
    'ShopHomeMed': 'src/facetDB/shopHomeMed.json',
};

const data: Record<string, Product> = JSON.parse(
  fs.readFileSync(vendorMap[vendor], 'utf-8')
);
const products: Product[] = Object.values(data);

// Tries to match user-provided facet name with an actual key from product data using fuzzy matching
function resolveFacetKey(userFacet: string, productSample: Product): string | undefined {
  const normUserKey = normalizeFacetKey(userFacet);
  const keys = Object.keys(productSample);

  for (const key of keys) {
    const normKey = normalizeFacetKey(key);
    if (normKey.includes(normUserKey) || normUserKey.includes(normKey)) {
      return key;
    }
  }
  return undefined;
}

// Normalizes facet key to lowercase for consistent comparisons
function normalizeFacetKey(key: string): string {
    return key.toLowerCase();
}

// Remove unnecessary keys from product objects
const filteredProducts = products.map(({ title, vendor, ...rest }) => rest);
console.log(`Total products for vendor "${vendor}": ${filteredProducts.length}\n`);

// Extract all facets and its corresponding counts
function extractFacetCounts(products: Product[]): Record<string, Record<string, number>> {
  const facetMap: Record<string, Record<string, number>> = {};

  for (const product of products) {
    for (const [rawKey, val] of Object.entries(product)) {
      const resolvedKey = resolveFacetKey(rawKey, product);
      const normKey = normalizeFacetKey(resolvedKey ?? rawKey);

      const values = Array.isArray(val)
        ? val
        : typeof val === 'string'
        ? [val]
        : [];

      for (const value of values) {
        if (typeof value === 'string') {
          const normalizedValue = value.trim(); // optionally add normalization
          if (!facetMap[normKey]) facetMap[normKey] = {};
          facetMap[normKey][normalizedValue] = (facetMap[normKey][normalizedValue] || 0) + 1;
        }
      }
    }
  }

  return facetMap;
}

// Suggest related facets based on existing filters
function suggestRelatedFacets(
  products: Product[],
  filters: { facet: string; value: string }[]
): Record<string, Record<string, number>> {
  const includedFacets = new Set(filters.map(f => normalizeFacetKey(f.facet)));
  const coFacetMap: Record<string, Record<string, number>> = {};

  for (const product of products) {
    const matchesAll = filters.every(({ facet, value }) => {
      const normKey = normalizeFacetKey(facet);
      const val = product[facet] ?? product[normKey];
      const valList = Array.isArray(val) ? val : typeof val === 'string' ? [val] : [];
      return valList.some(v => v.toLowerCase() === value.toLowerCase());
    });

    if (matchesAll) {
      for (const [rawKey, rawVal] of Object.entries(product)) {
        const normKey = normalizeFacetKey(rawKey);
        if (includedFacets.has(normKey)) continue;

        const values = Array.isArray(rawVal)
          ? rawVal
          : typeof rawVal === 'string'
          ? [rawVal]
          : [];

        for (const val of values) {
          if (!coFacetMap[normKey]) coFacetMap[normKey] = {};
          coFacetMap[normKey][val] = (coFacetMap[normKey][val] || 0) + 1;
        }
      }
    }
  }

  // Sort facets by total value count and return only top 5
  const topFacets = Object.entries(coFacetMap)
    .map(([facet, values]) => ({
      facet,
      total: Object.values(values).reduce((a, b) => a + b, 0),
      values,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Convert back to Record<string, Record<string, number>>
  const topFacetMap: Record<string, Record<string, number>> = {};
  for (const f of topFacets) {
    topFacetMap[f.facet] = f.values;
  }

  return topFacetMap;
}

const facetMap = extractFacetCounts(filteredProducts);
let count = 0;
let relatedFacets: Record<string, Record<string, number>> = {};

// Filter products based on facet-value pairs and suggest related facets for matching products
if (facets.length && values.length) {
  let matchedProducts = filteredProducts;

  facets.forEach((facet, i) => {
  const value = values[i];

  matchedProducts = matchedProducts.filter((product: Product) => {
    const resolvedKey = resolveFacetKey(facet, product); 
    if (!resolvedKey) return false;

    const val = product[resolvedKey];
    const valList = Array.isArray(val) ? val : typeof val === 'string' ? [val] : [];
    return valList.some(v => v.toLowerCase() === value.toLowerCase());
  });
});

  count = matchedProducts.length;
  const filters = facets.map((f, i) => ({ facet: f, value: values[i] }));
  const relatedFacetValues = suggestRelatedFacets(matchedProducts, filters);
  relatedFacets = relatedFacetValues;

  console.log(`Found ${count} product(s) matching:`);
  facets.forEach((f, i) => console.log(`• [${f}] = "${values[i]}"`));

  if (Object.keys(relatedFacetValues).length > 0) {
  console.log(`\nRelated facets:`);

  for (const [facet, values] of Object.entries(relatedFacetValues)) {
    const total = Object.values(values).reduce((a, b) => a + b, 0);
    console.log(`• ${facet} (${total})`);
    Object.entries(values)
      .sort(([, a], [, b]) => b - a)
      .forEach(([val, count]) => {
        console.log(`   - ${val} (${count})`);
      });
  }
 }
}
// Show autosuggested values for user-specified facets
else if (facets.length && !values.length) {
  console.log(`Auto-suggested values for facets:\n`);

  facets.forEach(f => {
    const normKey = normalizeFacetKey(f);
    const valuesMap = facetMap[normKey];

    if (!valuesMap) {
      console.log(`Facet "${f}" not found for vendor "${vendor}"`);
    } else {
      const total = Object.values(valuesMap).reduce((sum, c) => sum + c, 0);
      console.log(`Facet: ${f} (${total} products)`);

      Object.entries(valuesMap)
        .sort((a, b) => b[1] - a[1])
        .forEach(([val, count]) =>
          console.log(`• ${val} (${count} product${count !== 1 ? 's' : ''})`)
        );
    }
  });
}
// Display all detected facets and their values if no facet filters were applied
else {
  console.log(`Detected facets and values for vendor "${vendor}":\n`);
  for (const [key, values] of Object.entries(facetMap)) {
  const totalCount = Object.values(values).reduce((acc, cur) => acc + cur, 0);
  console.log(`\nFacet: ${key} (${totalCount} products)`);

  Object.entries(values)
    .sort((a, b) => b[1] - a[1]) // sort by count descending
    .forEach(([val, count]) =>
      console.log(`• ${val} (${count})`)
    );
 }

  console.log(`Total products for vendor "${vendor}": ${filteredProducts.length}`);
}

// Save to file if requested
if (save) {
  const outFile = `src/facetOut/${save}`;
  let output: any;

  if (facets.length && values.length) {
    const filters = facets.map((f, i) => ({ facet: f, value: values[i] }));
    output = {
      vendor,
      filters,
      matchCount: count,
      relatedFacets,
    };
  } else if (facets.length) {
    output = {
      vendor,
      facets,
      suggestedValues: facets.reduce((acc, f) => {
        acc[f] = facetMap[normalizeFacetKey(f)];
        return acc;
      }, {} as Record<string, Record<string, number>>)
    };
  } else {
    output = {
      vendor,
      facets: facetMap
    };
  }

  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
  console.log(`Output saved to ${outFile}`);
};
