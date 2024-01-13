import bcrypt from "bcryptjs";

const users = [
  {
    name: "Admin",
    email: "admin@example.com",
    password: bcrypt.hashSync("123456", 10),
    phone: "013456789",
    pCoin: 0,
    isAdmin: true,
  },
  {
    name: "User",
    email: "user@example.com",
    password: bcrypt.hashSync("123456", 10),
    phone: "123456789",
    pCoin: 0,
  },
];

export default users;
