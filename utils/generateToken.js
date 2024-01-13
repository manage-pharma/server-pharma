import jwt from "jsonwebtoken";
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};
export const createActivationToken = (payload) => {
  return jwt.sign({ payload }, process.env.JWT_SECRET, { expiresIn: "15m" });
};
