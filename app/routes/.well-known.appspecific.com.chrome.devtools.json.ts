

export const loader = async () => {
  return {
    "extensions": [{
      "web_application_id": "motomanager",
      "url": "http://localhost:3000/",
      "last_used": new Date().toISOString()
    }]
  };
}
