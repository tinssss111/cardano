import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Simple file-based storage since we don't have a database set up
const DATA_DIR = path.join(process.cwd(), 'data');
const IMAGES_FILE = path.join(DATA_DIR, 'user_images.json');

interface UserImage {
    id: string;
    walletAddress: string;
    prompt: string;
    imageUrl: string;
    createdAt: string;
}

// Initialize data directory and file if they don't exist
function initializeStorage() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(IMAGES_FILE)) {
        fs.writeFileSync(IMAGES_FILE, JSON.stringify([]));
    }
}

// Read all user images
function getUserImages(): UserImage[] {
    try {
        initializeStorage();
        const data = fs.readFileSync(IMAGES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading user images:', error);
        return [];
    }
}

// Save user images
function saveUserImages(images: UserImage[]) {
    try {
        initializeStorage();
        fs.writeFileSync(IMAGES_FILE, JSON.stringify(images, null, 2));
    } catch (error) {
        console.error('Error saving user images:', error);
    }
}

// GET endpoint to retrieve user images by wallet address
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
        return NextResponse.json(
            { error: 'Wallet address is required' },
            { status: 400 }
        );
    }

    const allImages = getUserImages();
    const userImages = allImages.filter(
        image => image.walletAddress === walletAddress
    );

    return NextResponse.json(userImages);
}

// POST endpoint to save a new user image
export async function POST(request: Request) {
    try {
        const { walletAddress, prompt, imageUrl } = await request.json();

        if (!walletAddress || !prompt || !imageUrl) {
            return NextResponse.json(
                { error: 'Wallet address, prompt, and image URL are required' },
                { status: 400 }
            );
        }

        const allImages = getUserImages();

        // Save image data
        const newImage: UserImage = {
            id: uuidv4(),
            walletAddress,
            prompt,
            imageUrl,
            createdAt: new Date().toISOString(),
        };

        allImages.unshift(newImage); // Add to beginning of array (most recent first)
        saveUserImages(allImages);

        return NextResponse.json(newImage);
    } catch (error) {
        console.error('Error saving image:', error);
        return NextResponse.json(
            { error: 'Failed to save image' },
            { status: 500 }
        );
    }
} 