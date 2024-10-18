import { error } from '@sveltejs/kit';

/** @type {import('./$types.d').RequestHandler} */
export function GET({ url }) {
	const min = Number(url.searchParams.get('min') ?? '0');
	const max = Number(url.searchParams.get('max') ?? '1');

	const d = max - min;

	if (isNaN(d) || d < 0) {
		error(400, 'min and max must be numbers, and min must be less than max');
	}

	const random = min + Math.random() * d;

	return new Response(String(random));
}


/*
async function submitImageToOpenAI(image: Blob): Promise<string> {
    const apiEndpoint = 'https://api.openai.com/v2/engines/chatgpt-4/completions'; // Replace with the appropriate endpoint for ChatGPT-4
    const apiKey = 'YOUR_OPENAI_API_KEY'; // replace with your actual API key
  
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  
    const requestBody = {
      prompt: {
        messages: [{
          role: "system",
          content: "You are a helpful assistant that converts images of tables into CSV format."
        }, {
          role: "user",
          content: "Please convert the following image into CSV."
        }, {
          role: "assistant",
          image: {
            url: 'data:image/jpeg;base64,' + btoa(new TextDecoder().decode(image)),
          }
        }]
      },
      max_tokens: 2000 // adjust as needed
    };
  
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });
  
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
  
      const responseData = await response.json();
      return responseData.choices[0].message.content.trim();
    } catch (error) {
      console.error('There was a problem with the fetch operation:', error.message);
      throw error;
    }
  }
  
  // Example usage
  (async () => {
    const image = new Blob([YOUR_IMAGE_DATA], { type: 'image/jpeg' }); // replace with your actual image data
    const result = await submitImageToOpenAI(image);
    console.log(result);
  })();
  */