const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    provider: String,
    username: String,
    googleId: String,
    gender: String,
    dateCreated: {type: Date, default: Date.now}
})

const User = mongoose.model('user', userSchema);

module.exports = User;