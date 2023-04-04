var mongoose = require("mongoose");

var signUpSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  message: String,
  token: String,
  isUserCreated: Boolean,
});

module.exports = mongoose.model("users", signUpSchema);
