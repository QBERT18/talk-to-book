export const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://admin:admin@localhost:27017/talktobook?authSource=admin",
  },
};
