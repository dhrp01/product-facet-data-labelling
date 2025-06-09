import * as dotenv from 'dotenv';
import { jinaBaseUrl, productsJsonUrl } from './config/urls';
import path from 'path';
import * as fs from 'fs/promises'

dotenv.config();

// Jina API token, update .env file with your token
// Example: JINA_API_TOKEN=your_token_here
const jinaApiToken = process.env.JINA_API_TOKEN;

// Function to cache product data from Jina API
// It checks if a cache file exists, if not, it fetches data from Jina API and saves it to the cache file
async function cacheProductData(productUrl: string, jinaBaseUrl: string, cacheFilePath: string): Promise<any> {
    try {
        // Check if cache file exists
        const fileContent = await fs.readFile(cacheFilePath, 'utf-8');
        console.debug("Cache file exists, reading from cache:", cacheFilePath);
        return JSON.parse(fileContent);
    } catch (error) {
        // If cache file does not exist, fetch data using Jina
        console.debug("Cache file does not exist, fetching data from Jina API");
        const data = await fetchAllProductData(productUrl, jinaBaseUrl);
        // Convert data to JSON string and save to cache file
        await fs.mkdir(path.dirname(cacheFilePath), { recursive: true });
        await fs.writeFile(cacheFilePath, JSON.stringify(data, null, 2));
        console.debug("Data cached to:", cacheFilePath);
        return data;
    }
}

// Fetch all product data from the Jina API
async function fetchAllProductData(productUrl: string, jinaBaseUrl: string): Promise<any> {
    let allProducts: any[] = [];
    let page = 1;
    let limit = 250;
    while (true) {
        const paginatedUrl = `${productUrl}?limit=${limit}&page=${page}`;
        console.debug(`Fetching: ${paginatedUrl}`);
        try {
            const response = await fetch(`${jinaBaseUrl}${paginatedUrl}`, {
                headers: {
                    "Authorization": `Bearer ${jinaApiToken}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            });
            const data = await response.json();
            const content = data?.data?.content;
            if (content === "'{\"products\":[]}'") {
                console.debug("No more products found, breaking the loop.");
                break;
            }
            const products = JSON.parse(content)?.products || [];
            if (products.length === 0) {
                console.debug("No more products in current page, breaking the loop.");
                break;
            }
            console.debug("Response data:", products);
            allProducts.push(...products);
            page += 1;
            console.debug("JSON data:", data);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }
    console.debug(`Total products fetched: ${allProducts.length}`);
    return allProducts;
}

async function fetchData(){
    for (const [key, url] of Object.entries(productsJsonUrl)) {
        let filePath = path.join(__dirname, 'data', `${key}.json`);
        await cacheProductData(url, jinaBaseUrl, filePath);
    }
}

fetchData();