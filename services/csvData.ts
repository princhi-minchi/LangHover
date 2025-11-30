export const fetchVerbData = async (): Promise<string> => {
  // Chrome extensions can fetch files from their own public folder using chrome.runtime.getURL
  // In a normal React dev environment, it just fetches from the root.
  const url = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL 
    ? chrome.runtime.getURL('verbs.csv') 
    : '/verbs.csv';

  const response = await fetch(url);
  const text = await response.text();
  return text;
};