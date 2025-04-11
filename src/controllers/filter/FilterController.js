const Filter = require("../../models/Filter");

// Create a new filter
exports.createFilter = async (req, res) => {
  try {
    const filter = new Filter(req.body);
    await filter.save();
    res.status(201).json(filter);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all filters
exports.getAllFilters = async (req, res) => {
    console.log("qqqqqqqqqqqqqqqqqqqqqqqqqqq")
  try {
    const filters = await Filter.find();
    console.log("filters",filters)
    res.json(filters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single filter by ID
exports.getFilterById = async (req, res) => {
  try {
    const filter = await Filter.findById(req.params.id);
    if (!filter) return res.status(404).json({ error: "Filter not found" });
    res.json(filter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a filter
exports.updateFilter = async (req, res) => {
  try {
    const filter = await Filter.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!filter) return res.status(404).json({ error: "Filter not found" });
    res.json(filter);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete a filter
exports.deleteFilter = async (req, res) => {
  try {
    const filter = await Filter.findByIdAndDelete(req.params.id);
    if (!filter) return res.status(404).json({ error: "Filter not found" });
    res.json({ message: "Filter deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
