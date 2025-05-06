import { Data } from "lucid-cardano";

const MarketplaceDatumSchema = Data.Object({
    policyId: Data.Bytes(),
    assetName: Data.Bytes(),
    seller: Data.Bytes(),
    price: Data.Integer()
})

type MarketplaceDatum = Data.Static<typeof MarketplaceDatumSchema>;

export const MarketplaceDatum = MarketplaceDatumSchema as unknown as MarketplaceDatum
