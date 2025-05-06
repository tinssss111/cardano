import { NextResponse } from 'next/server';

// Increase timeout for API route (2 minutes)
export const maxDuration = 120;

// Available models in order of preference
const MODELS = {
    primary: 'black-forest-labs/FLUX.1-dev',
    fallback: 'stabilityai/stable-diffusion-xl-base-1.0'
};

export async function POST(request: Request) {
    try {
        const { prompt, useFallbackModel } = await request.json();

        // Validate request
        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt is required' },
                { status: 400 }
            );
        }

        // Validate API key
        if (!process.env.HUGGINGFACE_API_KEY) {
            return NextResponse.json(
                { error: 'Hugging Face API key is not configured' },
                { status: 500 }
            );
        }

        // Select model based on request or use primary by default
        const selectedModel = useFallbackModel ? MODELS.fallback : MODELS.primary;

        // Adjust timeout based on model (90 seconds for primary, 60 for fallback)
        const timeoutMs = useFallbackModel ? 60000 : 90000;

        // Create an AbortController to handle timeouts
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            console.log(`Generating image with model: ${selectedModel}, timeout: ${timeoutMs}ms`);

            const response = await fetch(
                `https://api-inference.huggingface.co/models/${selectedModel}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY || ''}`,
                    },
                    body: JSON.stringify({ inputs: prompt }),
                    signal: controller.signal,
                }
            );

            // Clear the timeout since the request completed
            clearTimeout(timeoutId);

            if (!response.ok) {
                // Handle non-OK responses
                const errorMessage = 'Failed to generate image';
                const errorDetails: {
                    status: number;
                    statusText: string;
                    message?: string;
                    model?: string;
                    [key: string]: unknown;
                } = {
                    status: response.status,
                    statusText: response.statusText,
                    model: selectedModel
                };

                try {
                    // Try to get JSON error info
                    const errorJson = await response.json();
                    Object.assign(errorDetails, errorJson);
                } catch {
                    // If not JSON, try to get text content
                    try {
                        const errorText = await response.text();
                        errorDetails.message = errorText.substring(0, 200); // Include just the beginning
                    } catch {
                        errorDetails.message = 'Could not parse error response';
                    }
                }

                return NextResponse.json(
                    { error: errorMessage, details: errorDetails },
                    { status: response.status }
                );
            }

            // Check response content type to handle different response formats
            const contentType = response.headers.get('content-type');

            if (contentType?.includes('application/json')) {
                // Handle JSON response (some models return JSON)
                const jsonResponse = await response.json();

                // If the model returned a direct URL to the image
                if (typeof jsonResponse === 'string' && jsonResponse.startsWith('http')) {
                    return NextResponse.json({ image: jsonResponse, model: selectedModel });
                }

                // If the model returned an error message
                if (jsonResponse.error) {
                    return NextResponse.json(
                        { error: 'Model error', details: jsonResponse, model: selectedModel },
                        { status: 400 }
                    );
                }

                // Unexpected JSON format
                return NextResponse.json(
                    { error: 'Unexpected response format from model', details: jsonResponse, model: selectedModel },
                    { status: 500 }
                );
            }

            // Handle binary/image response (most common for image generation)
            const imageBlob = await response.blob();
            const imageBuffer = await imageBlob.arrayBuffer();
            const base64Image = Buffer.from(imageBuffer).toString('base64');

            return NextResponse.json({
                image: `data:image/jpeg;base64,${base64Image}`,
                model: selectedModel
            });
        } catch (fetchError) {
            // Clear the timeout in case of error
            clearTimeout(timeoutId);

            // Handle AbortController timeout
            if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
                // If using primary model, suggest trying fallback
                if (!useFallbackModel) {
                    return NextResponse.json(
                        {
                            error: `The image generation request timed out after ${timeoutMs / 1000} seconds`,
                            canUseFallback: true,
                            timeoutSeconds: timeoutMs / 1000
                        },
                        { status: 408 }
                    );
                }

                return NextResponse.json(
                    { error: `The image generation request timed out after ${timeoutMs / 1000} seconds` },
                    { status: 408 }
                );
            }

            // Handle other fetch errors
            throw fetchError; // Re-throw to be caught by outer try/catch
        }
    } catch (error) {
        console.error('Error generating image:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate image',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
} 