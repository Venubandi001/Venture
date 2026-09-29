// shpjs 6 ships no types (@types/shpjs is for v3). Only what shapefileImport.ts uses.
declare module "shpjs" {
  import type { FeatureCollection } from "geojson";
  type Collection = FeatureCollection & { fileName?: string };
  export default function shp(input: ArrayBuffer): Promise<Collection | Collection[]>;
}
