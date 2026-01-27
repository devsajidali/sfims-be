export const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

export const error = (message: string) => {
  console.error(`[${new Date().toISOString()}] ERROR: ${message}`);
};
