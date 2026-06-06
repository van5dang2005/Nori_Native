
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatMessage, Customer, CustomerLog } from "@/src/types/types";

export const getGeminiChatResponse = async (
  history: ChatMessage[],
  currentCustomer: Customer | null,
  logs: CustomerLog[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const customerContext = currentCustomer 
    ? `Current focused customer: ${currentCustomer.name} from ${currentCustomer.company}. 
       Recent logs: ${logs.filter(l => l.customerId === currentCustomer.id).slice(-5).map(l => l.content).join('; ')}`
    : 'No specific customer selected.';

  const systemPrompt = `You are a helpful AI assistant for the Nori Log platform.
  Context: ${customerContext}
  Your goal is to help agents analyze customer behavior, summarize notes, or provide quick advice on client interactions.
  Keep responses professional, concise, and helpful. Use markdown for formatting.`;

  const contents = history
    .filter(msg => msg.role === 'user' || msg.role === 'model')
    .map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error communicating with AI service. Please check your connectivity.";
  }
};
