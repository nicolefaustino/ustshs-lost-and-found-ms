import { useState, useEffect } from "react"

function ItemFilter({ isOpen, onClose, onApplyFilters, onResetFilters, initialFilters, categories, statuses }) {
  const [filters, setFilters] = useState(initialFilters)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setFilters(initialFilters)
  }, [initialFilters, onApplyFilters])

  if (!isOpen) return null

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleApply = async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500)) // fetch delay

    // Apply all filters together instead of checking if they're empty
    onApplyFilters(filters)

    setIsLoading(false)
    onClose()
  }

  const handleReset = () => {
    setFilters({
      date: "",
      orderBy: "",
      category: "",
      status: "",
    })
    onResetFilters()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-11/12 md:w-1/2 lg:w-1/3">
        <div className="flex justify-end">
          <button onClick={onClose} className="cursor-pointer text-gray-600 hover:text-gray-800">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-md p-2"
              value={filters.date}
              onChange={(e) => handleFilterChange("date", e.target.value)}
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Order By</label>
            <select
              className="w-full border border-gray-300 rounded-md p-2"
              value={filters.orderBy}
              onChange={(e) => handleFilterChange("orderBy", e.target.value)}
            >
              <option value="">Select order</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Category</label>
            <select
              className="w-full border border-gray-300 rounded-md p-2"
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Status</label>
            <select
              className="w-full border border-gray-300 rounded-md p-2"
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleReset}
            className="cursor-pointer px-4 py-2 bg-gray-300 text-gray-700 border border-gray-300 rounded-4xl hover:bg-gray-400 not-visited:transition-colors duration-200"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="cursor-pointer px-4 py-2 bg-green-500 text-white rounded-4xl hover:bg-green-600 transition"
            disabled={isLoading}
          >
            {isLoading ? "Applying..." : "Apply"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ItemFilter

