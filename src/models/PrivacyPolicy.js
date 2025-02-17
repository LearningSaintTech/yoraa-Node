const mongoose = require('mongoose');

const privacyPolicySchema = new mongoose.Schema({
  privacyPolicy: [
    {
      question: { type: String, required: true },
      answer: [{ type: String, required: true }]
    }
  ]
}, { timestamps: true });

const PrivacyPolicy = mongoose.model('PrivacyPolicy', privacyPolicySchema);

module.exports = PrivacyPolicy;
