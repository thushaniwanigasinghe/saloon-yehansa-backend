const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE");

// 1. REAL Face Shape Analysis using Gemini Vision
router.post('/analyze-face', async (req, res) => {
  try {
    const { image } = req.body; // base64 string
    if (!image) return res.status(400).json({ message: "Image required" });

    // Extract base64 and mime type
    const mimeTypeMatch = image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    const prompt = `You are an expert high-end hair stylist and facial proportion analyst. 
Analyze the provided face image and determine the face shape (Oval, Square, Round, Heart, Diamond, or Oblong).
If no clear face is provided, analyze the general features visible or provide a default Oval analysis.
Recommend exactly 3 highly specific, detailed hairstyles that suit this face shape perfectly.
Return ONLY a valid JSON object in this exact format, with no markdown formatting or backticks:
{
  "shape": "Face Shape Name",
  "recommendations": [
    {
      "name": "Hairstyle Name",
      "desc": "A detailed 2-sentence explanation of why it perfectly balances and suits this specific face shape.",
      "bestHairType": "e.g., Thick, Straight, Wavy, Fine",
      "maintenance": "Low, Medium, or High",
      "stylingTips": "A quick tip on what product to use or how to style it daily."
    }
  ]
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);
    
    const responseText = result.response.text();
    
    // Clean and parse JSON
    let parsedResult;
    try {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
      
      // Fallback images since Gemini only returns text
      parsedResult.recommendations = parsedResult.recommendations.map((rec, index) => ({
        ...rec,
        id: `gen-${index}`,
        img: index === 0 
          ? "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=500&auto=format&fit=crop&q=60" 
          : "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=500&auto=format&fit=crop&q=60"
      }));
    } catch (e) {
       console.error("Failed to parse Gemini output:", responseText);
       parsedResult = { shape: "Oval", recommendations: [] };
    }

    res.json(parsedResult);
  } catch (error) {
    console.error("AI Analysis Error:", error);
    res.status(500).json({ message: "Failed to analyze face. Check if Gemini API key is valid." });
  }
});

// 2. REAL Virtual Try-On integration via Replicate (or similar Generative Image API)
router.post('/generate-tryon', async (req, res) => {
  try {
    const { userImage, styleName, styleImage } = req.body;
    
    // To make this real, you need an API key for a service like Replicate that hosts Stable Diffusion / FaceSwap models
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
    
    if (REPLICATE_API_TOKEN) {
      // Execute the real API call using native fetch (Node 18+)
      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Token ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "a07f252abbbd83b0085cb700ff314b26514125263d58ea303dfc71e95e1e5491", // ID for a face swap model
          input: {
            swap_image: userImage, // The user's face
            target_image: styleImage // The hairstyle body
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorText = errorData ? errorData.detail || errorData.title : await response.text();
        console.error("Replicate API Error:", errorText);
        throw new Error("Replicate API Error: " + errorText);
      }

      let prediction = await response.json();
      const pollUrl = prediction.urls.get;

      // Poll until completion (max ~30 seconds for face swap)
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const pollResponse = await fetch(pollUrl, {
          headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` }
        });
        prediction = await pollResponse.json();

        if (prediction.status === "succeeded") {
          return res.json({ 
            status: "success", 
            realApiUsed: true,
            message: "Generation completed successfully",
            generatedImage: prediction.output // Usually a URL or array of URLs
          });
        }
        
        if (prediction.status === "failed" || prediction.status === "canceled") {
          throw new Error("Prediction failed on Replicate");
        }
      }
      
      throw new Error("Prediction timed out");
    } else {
      // MOCK FALLBACK (If the developer hasn't provided the Replicate API token yet)
      setTimeout(() => {
        res.json({ 
          status: "success", 
          mocked: true, 
          message: "Real API requires REPLICATE_API_TOKEN in backend/.env file. Using frontend composite fallback.",
          generatedImage: null 
        });
      }, 2000);
    }

  } catch (error) {
    console.error("TryOn Error:", error);
    res.status(500).json({ message: error.message || "Failed to generate try-on" });
  }
});

module.exports = router;
