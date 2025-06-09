# Shopify Product Facet Data Labelling System

A CLI tool for detecting and analyzing product facets from vendor data.

## Features

- Detects available facets (attributes) and their values for a given vendor.
- Filters products by facet and value.
- Suggests related facets and values based on filters.
- Outputs results to the console or saves to a file.

## Getting Started

### Architecture

![Architecture Diagram](assets/FacetDetection%20-%20Arch%20Diagram.png)

### Prerequisites

- [Node.js](https://nodejs.org/en)
- [TypeScript](https://www.typescriptlang.org/)
- [pnpm](https://pnpm.io/)

### Installation

```sh
pnpm install
```

### Usage

Run the CLI with 

```sh
➜ npx ts-node src/index.ts --vendor ShopHomeMed
Options:
  --vendor <vendor>                  Vendor name to filter products. Valid vendor names: LibertySkis, WildRye, DarnTough, PearlIzumi,
                                     PepperHome, ShopHomeMed
  -f, --facet <facet...>             Facet to filter products
  -v, --facet-value <facetValue...>  Facet-value to filter products
  --save <fileName>                  Save the output to a file
  -h, --help                         display help for command
```

To fetch shopify `product.json` run:
```sh
➜ npx ts-node src/fetcher.ts
```

To run facet detection on the fetched data run:
```sh
➜ npx ts-node src/facetDetector.ts
```

#### Note
1. Before running the scripts, create `.env` file in local repository at root level and update the file with GROQ API KEY (GROQ_API_KEY) and JINA API KEY (JINA_API_TOKEN)

E.g
```.env
JINA_API_TOKEN=<JINA API TOKEN>
GROQ_API_KEY=<GROQ API KEY>
```

2. You need to run `fetcher.ts` and `facetDetector.ts` only for vendors outside "Liberty Skis, Wild Rye, Darn Tough, Pearl Izumi, Pepper Home and Shop Home Med"


### Data Structure
- Preprocessed vendor facet data and its values are stored in `src/facetDB/` in JSON format.
- Saved output files are saved to `src/facetOut/`.
- WebScrapped data is stored in json format on per store basis in `src/data/`.

### Development
- Main CLI logic: `src/index.ts`.
- DTOs: `src/dto/dto.ts`.
- Vendor facet data: `src/facetDB/`.
- WebScrap/Fetch shopify `product.json` from individual vendor using `src/fetcher.ts`.
- Update vendor URLs in `config/urls.ts`.
- Detect the fetched data using `src/facetDetector.ts`.


### Sample Execution Results

- User can opt to select the vendor and list all the available product labels.
```sh
➜ npx ts-node src/index.ts --vendor LibertySkis
Total products for vendor "LibertySkis": 93

Detected facets and values for vendor "LibertySkis":


Facet: ability (220 products)
• Expert (64)
• Intermediate (63)
• Advanced (46)
• Beginner (45)
• Phenolic plate under foot (1)
• beginner to expert (1)

Facet: gender (83 products)
• men (43)
• women (29)
• unisex (7)
• junior (4)

Facet: series (70 products)
• Scope (18)
• Helix (12)
• Evolv (11)
• Genesis (9)
• Radian (8)
• Horizon (4)
• Origin (4)
• Genome (3)
• Coors Banquet (1)

Facet: terrain (143 products)
• All Mountain (49)
• Freestyle (25)
• Directional Free (23)
• Freeride (23)
• Powder (22)
• Any mountain in North America and beyond (1)

Facet: waist (73 products)
• 90-99mm (29)
• 100-109mm (19)
• < 90mm (14)
• 110-119mm (5)
• > 119mm (2)
• slimmer waist (1)
• 99mm (1)
• 141mm (1)
• 100mm (1)

Facet: product_type (99 products)
• Demo (26)
• 2024 Skis (16)
• Gear (13)
• 2026 Skis (12)
• 2025 Skis (12)
•  (3)
• Poles (3)
• ski (2)
...
```

- User can just input a predefined facet.
```sh
➜ npx ts-node src/index.ts --vendor DarnTough --facet intended_use
Total products for vendor "DarnTough": 398

Auto-suggested values for facets:

Facet: intended_use (36 products)
• hiking (3 products)
• Hunting (2 products)
• ski boots (2 products)
• snowboard boots (2 products)
• trail (2 products)
• skiing (1 product)
• riding (1 product)
• women’s casual, everyday socks (1 product)
• ski/ride (1 product)
• ride boots (1 product)
• backcountry (1 product)
• alpine (1 product)
• snowboarding (1 product)
• treadmill (1 product)
• big summit efforts (1 product)
• down day energy (1 product)
• explore beyond your comfort zone (1 product)
• all-day (or multi-day) wearability (1 product)
• everyday wear (1 product)
• Orwellian workplace (1 product)
• family skiing (1 product)
• day use (1 product)
• Hot weather (1 product)
• extreme climate (1 product)
• rugged terrain (1 product)
• extreme cold weather (1 product)
• mountaineering (1 product)
• cooler climates (1 product)
• hauling heavier loads (1 product)
• thru-hiking (1 product)
```

- Multiple facet and user given facet input. There are additional facets and facet-values auto-suggested by the system.
```sh
➜ npx ts-node src/index.ts --vendor ShopHomeMed --facet gender size --facet-value men S
Total products for vendor "ShopHomeMed": 5027

Found 4 product(s) matching:
• [gender] = "men"
• [size] = "S"

Related facets:
• color (11)
   - Black (2)
   - White (2)
   - Red (2)
   - Blue (2)
   - Green (2)
   - Yellow (1)
• material (7)
   - Polyester (2)
   - Cotton (2)
   - Spandex (1)
   - Wool (1)
   - 100% Cotton (1)
• product_type (4)
   - Misc (4)
• price (4)
   - 174.99 (1)
   - 123.99 (1)
   - 103.99 (1)
   - 128.00 (1)
• compare_at_price (4)
   - 174.99 (1)
   - 123.99 (1)
   - 103.99 (1)
   - 0.00 (1)
```

- User can also save the output to a particular file.
```sh
➜ npx ts-node src/index.ts --vendor LibertySkis --facet gender --facet-value men --save test1.json
Total products for vendor "LibertySkis": 93

Found 43 product(s) matching:
• [gender] = "men"

Related facets:
• length (cm) (150)
   - 179 (20)
   - 172 (18)
   - 186 (14)
   - 182 (12)
   - 165 (9)
   - 164 (7)
   - 167 (7)
   - 173 (7)
   - 176 (7)
   - 180 (7)
   - 185 (7)
   - 187 (7)
   - 168 (5)
   - 171 (4)
   - 175 (4)
   - 190 (4)
   - 181 (3)
   - 188 (3)
   - 194 (3)
   - 152 (1)
   - 160 (1)
• ability (131)
   - Expert (41)
   - Intermediate (37)
   - Advanced (31)
   - Beginner (22)
• terrain (87)
   - All Mountain (27)
   - Powder (17)
   - Directional Free (15)
   - Freestyle (15)
   - Freeride (12)
   - Any mountain in North America and beyond (1)
• length_(cm) (54)
   - 179cm (10)
   - 172cm (9)
   - 186cm (9)
   - 165cm (7)
   - 182cm (5)
   - 171cm (3)
   - 176cm (3)
   - 187cm (3)
   - 168cm (2)
   - 175cm (2)
   - [167cm, 179cm] (1)
• radius_(m) (54)
   - 17m (8)
   - 19m (6)
   - 21m (5)
   - 20m (5)
   - 17.5m (4)
   - 18m (4)
   - 19.5m (3)
   - 15.5m (2)
   - 18.5m (2)
   - 14.5m (2)
   - 16m (2)
   - 16.5m (2)
   - 16/13m (2)
   - 17/14m (2)
   - 18/15m (2)
   - [15.5m, 18m] (1)
   - 21.5m (1)
   - 23m (1)
Output saved to src/facetOut/test1.json
```