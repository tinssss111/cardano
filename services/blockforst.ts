/* eslint-disable @typescript-eslint/no-explicit-any */
class BlockforstService {
    private baseUrl: string;
    private projectId: string;

    constructor() {
        this.baseUrl = "https://cardano-preprod.blockfrost.io/api/v0";
        this.projectId = 'preprodKdtH4a7FVm5TDPfxWQBXqDquliI6mFlk';
    }

    async getAddressUtxos(address: string) {
        if (!address) throw new Error('Address is required');

        try {
            const response = await fetch(
                `${this.baseUrl}/addresses/${address}/utxos`,
                {
                    headers: {
                        'Project_id': this.projectId
                    }
                }
            );
            return await response.json();
        } catch (error) {
            console.error('Error fetching UTXOs:', error);
            throw error;
        }
    }

    async getAssetDetails(unit: string) {
        if (!unit) throw new Error('Unit is required');

        try {
            const response = await fetch(
                `${this.baseUrl}/assets/${unit}`,
                {
                    headers: {
                        'Project_id': this.projectId
                    }
                }
            );
            return await response.json();
        } catch (error) {
            console.error('Error fetching asset details:', error);
            throw error;
        }
    }

    async getNFTs(address: string) {
        if (!address) throw new Error('Address is required');

        const utxos = await this.getAddressUtxos(address);

        const nonLovelaceAssets = utxos.flatMap((utxo: { amount: any[]; }) =>
            utxo.amount.filter(asset => asset.unit !== 'lovelace')
        );

        const nfts = await Promise.all(nonLovelaceAssets.map(async (asset: { unit: string; }) => {
            const assetDetails = await this.getAssetDetails(asset.unit);
            return {
                ...asset,
                assetDetails
            };
        }));

        return nfts;
    }
}

export default BlockforstService;