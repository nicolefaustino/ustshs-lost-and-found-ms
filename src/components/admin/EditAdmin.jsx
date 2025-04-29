import { useState } from "react"
import axios from "axios"

const EditAdmin = ({ isOpen, onClose, employee, onDeleteSuccess, onSaveSuccess }) => {
  const [role, setRole] = useState(employee?.role || "")
  const [showPopup, setShowPopup] = useState(false)
  const [popupMessage, setPopupMessage] = useState("")
  const API_URL = "https://ust-shs-lost-and-found-management-system.onrender.com"

  // Handle updating the admin's role
  const handleSave = async () => {
    try {
      const response = await axios.put(`${API_URL}/api/admins/${employee.id}`, {
        role,
      })
      if (response.status === 200) {
        setPopupMessage("Admin role updated successfully!")
        setShowPopup(true)
        onSaveSuccess(employee.id, role) // Notify parent component
      }
    } catch (error) {
      alert("Error updating admin role")
      console.error(error)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await axios.delete(`${API_URL}/api/admins/${employee.id}`)
      if (response.status === 200) {
        setPopupMessage("Admin removed successfully!")
        setShowPopup(true)
        onDeleteSuccess(employee.id) // Notify parent component
      }
    } catch (error) {
      alert("Error deleting admin")
      console.error(error)
    }
  }

  return (
    <>
      {isOpen && employee && (
        <div className="fixed inset-0 flex justify-center items-center bg-black/50 z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-lg w-full max-w-md sm:max-w-lg relative">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="cursor-pointer absolute top-2 right-4 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>

            {/* Modal Content */}
            <div className="space-y-3 text-m mt-4">
              <p className="break-words">
                <span className="text-gray-700">
                  <strong>Employee:</strong>
                </span>{" "}
                {employee.fullName}
              </p>

              <p className="break-words">
                <span className="text-gray-700">
                  <strong>Email:</strong>
                </span>{" "}
                {employee.email}
              </p>

              {/* Role Dropdown */}
              <label className="block font-semibold text-gray-700 text-m">Role:</label>
              <select
                className="cursor-pointer w-full border rounded-lg p-2 text-m"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="Support Staff">Support Staff</option>
                <option value="Super Admin">Super Admin</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
              <button
                onClick={handleDelete}
                className="cursor-pointer px-4 py-2 bg-red-500 text-white rounded-4xl hover:bg-red-600 order-2 sm:order-1"
              >
                Remove
              </button>
              <button
                onClick={handleSave}
                className="cursor-pointer px-4 py-2 bg-green-500 text-white rounded-4xl hover:bg-green-600 order-1 sm:order-2"
              >
                Save
              </button>
            </div>
          </div>

          {/* Success Popup Modal */}
          {showPopup && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg relative w-full max-w-xs">
                {/* Checkmark image and message */}
                <div className="flex flex-col items-center gap-2 mb-4">
                  <img src="https://i.imgur.com/eFvkfQz.png" alt="Checkmark" className="w-12 h-12" />
                  <h2 className="text-lg font-medium text-gray-800 text-center">{popupMessage}</h2>
                </div>

                {/* Done button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setShowPopup(false)
                      onClose() // Close the edit modal after success
                    }}
                    className="cursor-pointer px-4 py-2 bg-green-500 text-white rounded-4xl hover:bg-green-600"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default EditAdmin

