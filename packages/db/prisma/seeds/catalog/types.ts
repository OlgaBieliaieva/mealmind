export interface UsdaCatalogManifest {
  readonly schemaVersion: 1;
  readonly catalog: "usda-foundation-sr-legacy";
  readonly sourceRelease: string;
  readonly sourceFile: string;
  readonly sourceFileSha256: string;
  readonly sourceFileSizeBytes: number;
  readonly statistics: {
    readonly products: number;
    readonly nutrientValues: number;
    readonly portions: number;
  };
  readonly importPolicy: {
    readonly productType: "GENERIC";
    readonly productStatus: "ACTIVE";
    readonly verificationStatus: "UNVERIFIED";
  };
}

export interface UsdaCatalogImportReport {
  readonly dryRun: boolean;
  readonly productsTotal: number;
  readonly productsCreated: number;
  readonly productsUpdated: number;
  readonly nutrientValues: number;
  readonly portions: number;
  readonly batches: number;
}

export interface UsdaCatalogCleanupReport {
  readonly productsDeleted: number;
}
