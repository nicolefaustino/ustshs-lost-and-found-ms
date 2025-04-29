import { QrCodeIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";

const ItemInformation = ({ isOpen, onClose, item, activeTab }) => {
  const [isClaimFormOpen, setClaimFormOpen] = useState(false);
  const [isMatchClaimFormOpen, setMatchClaimFormOpen] = useState(false);
  const [claimedByID, setClaimedByID] = useState("");
  const [claimedByName, setClaimedByName] = useState("");
  const [showScanner, setShowScanner] = useState("");
  const [scanner, setScanner] = useState(null);
  const [isIDLocked, setIsIDLocked] = useState(false);

  const API_URL =
    "https://ust-shs-lost-and-found-management-system.onrender.com";

  useEffect(() => {
    // Cleanup function for the scanner
    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  }, [scanner]); // Runs only when scanner changes

  if (!isOpen || !item) return null;

  const fetchUserDataByName = async () => {
    if (!claimedByName.trim()) return;

    try {
      const response = await fetch(
        `${API_URL}/api/users/name/${claimedByName}`
      );

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log("Fetched user data:", responseData);

      if (responseData.exists && responseData.data) {
        setClaimedByID(
          responseData.data.employeeNumber || responseData.data.studentNum || ""
        );
        setIsIDLocked(true);
      } else {
        setClaimedByID("");
        setIsIDLocked(false);
        alert("No matching ID found for this name.");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      alert(`Failed to fetch data: ${error.message}`);
    }
  };

  const fetchUserDataByID = async (idNumber) => {
    if (!idNumber) return;

    try {
      const response = await fetch(`${API_URL}/api/users/id/${idNumber}`);

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log("Fetched user data:", responseData);

      if (responseData.exists && responseData.data) {
        setClaimedByName(responseData.data.fullName || "");
      } else {
        alert("No matching name found for this ID.");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      alert(`Failed to fetch data: ${error.message}`);
    }
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    await moveItem(); // Trigger the moveItem function
    setClaimFormOpen(false); // Close the claim form
  };

  const handleMatchClaimSubmit = async (e) => {
    e.preventDefault();
    await moveMatchItem(item.matchID); // Pass match ID
    setMatchClaimFormOpen(false);
  };

  const moveItem = async () => {
    try {
      const docId = item.id;

      if (!docId) {
        alert("No item ID found!");
        return;
      }

      const response = await fetch(`${API_URL}/api/moveItem/${docId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ claimedByID, claimedByName }), // Include form data in the request
      });

      const data = await response.json();

      if (data.success) {
        alert("Item claimed successfully");
        onClose(); // Close the modal after the move
      } else {
        alert("Failed to claim item");
      }
    } catch (error) {
      console.error("Error claiming item:", error);
      alert("An error occurred while claiming the item");
    }
  };

  const moveMatchItem = async () => {
    try {
      const docId = item.id; // Ensure we're using item.id like moveItem

      if (!docId) {
        alert("No item ID found!");
        return;
      }

      const response = await fetch(`${API_URL}/api/moveMatchItem/${docId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ claimedByID, claimedByName }), // Include form data
      });

      const data = await response.json();

      if (data.success) {
        alert("Matched item moved successfully!");
        onClose(); // Close modal after success
      } else {
        alert("Failed to move item: " + data.error);
      }
    } catch (error) {
      console.error("Error moving item:", error);
      alert("An error occurred while moving the item.");
    }
  };

  const cancelMatch = async () => {
    try {
      const docId = item.id;
      console.log("Match ID:", docId);

      if (!docId) {
        alert("No item ID found!");
        return;
      }

      const cancelResponse = await fetch(
        `${API_URL}/api/cancelMatch/${docId}`,
        {
          method: "DELETE",
        }
      );

      if (!cancelResponse.ok) {
        throw new Error("Failed to cancel match");
      }

      const cancelData = await cancelResponse.json();

      if (!cancelData.success) {
        throw new Error("Failed to cancel match");
      }

      alert("Match cancelled successfully");
      onClose(); // Close the modal
    } catch (error) {
      console.error("Error cancelling match:", error);
      alert(`An error occurred: ${error.message}`);
    }
  };

  const renderFoundContent = () => (
    <>
      <p>
        <strong>Category:</strong> {item.category}
      </p>
      <p>
        <strong>Date Found:</strong> {item.dateFound}
      </p>
      <p>
        <strong>Found ID:</strong> {item.foundID}
      </p>
      <p>
        <strong>Description:</strong> {item.found_item_desc}
      </p>
      <p>
        <strong>Item Name:</strong> {item.found_item_name}
      </p>
      <p>
        <strong>Location Found:</strong> {item.locationFound}
      </p>
      <p>
        <strong>Status:</strong> {item.status}
      </p>
    </>
  );

  const renderCICSContent = () => (
    <>
      <p>
        <strong>Category:</strong> {item.category}
      </p>
      <p>
        <strong>Date Found:</strong> {item.dateFound}
      </p>
      <p>
        <strong>Found ID:</strong> {item.foundID || item.lostID || "N/A"}
      </p>
      <p>
        <strong>Description:</strong>{" "}
        {item.found_item_desc || item.lost_item_desc || "N/A"}
      </p>
      <p>
        <strong>Item Name:</strong>{" "}
        {item.found_item_name || item.lost_item_name || "N/A"}
      </p>
      <p>
        <strong>Location Found:</strong>{" "}
        {item.locationFound || item.locationLost || "N/A"}
      </p>
      <p>
        <strong>Status:</strong> {item.status}
      </p>
    </>
  );

  const renderLostContent = () => (
    <>
      <p>
        <strong>Category:</strong> {item.category}
      </p>
      <p>
        <strong>Date Lost:</strong> {item.dateLost}
      </p>
      <p>
        <strong>Lost ID:</strong> {item.lostID}
      </p>
      <p>
        <strong>Description:</strong> {item.lost_item_desc}
      </p>
      <p>
        <strong>Item Name:</strong> {item.lost_item_name}
      </p>
      <p>
        <strong>Location Lost:</strong> {item.locationLost}
      </p>
      <p>
        <strong>Status:</strong> {item.status}
      </p>
    </>
  );

  const renderMatchContent = () => {
    const { foundItem = {}, lostItem = {} } = item;

    return (
      <div className="grid grid-cols-2 gap-4">
        {" "}
        {/* Added grid layout */}
        <div>
          <h3 className="text-md font-bold mb-2">Found Item</h3>
          <p>
            <strong>Category:</strong> {foundItem.category}
          </p>
          <p>
            <strong>Date Found:</strong> {foundItem.dateFound}
          </p>
          <p>
            <strong>Found ID:</strong> {foundItem.foundID}
          </p>
          <p>
            <strong>Description:</strong> {foundItem.found_item_desc}
          </p>
          <p>
            <strong>Item Name:</strong> {foundItem.found_item_name}
          </p>
          <p>
            <strong>Location Found:</strong> {foundItem.locationFound}
          </p>
          <p>
            <strong>Status:</strong> {foundItem.status}
          </p>
        </div>
        <div>
          <h3 className="text-md font-bold mb-2">Lost Item</h3>
          <p>
            <strong>Category:</strong> {lostItem.category}
          </p>
          <p>
            <strong>Date Lost:</strong> {lostItem.dateLost}
          </p>
          <p>
            <strong>Lost ID:</strong> {lostItem.lostID}
          </p>
          <p>
            <strong>Description:</strong> {lostItem.lost_item_desc}
          </p>
          <p>
            <strong>Item Name:</strong> {lostItem.lost_item_name}
          </p>
          <p>
            <strong>Location Lost:</strong> {lostItem.locationLost}
          </p>
          <p>
            <strong>Status:</strong> {lostItem.status}
          </p>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "FOUND ITEMS":
        return renderFoundContent();
      case "LOST ITEMS":
        return renderLostContent();
      case "POTENTIAL MATCHES":
        return renderMatchContent();
      case "ARCHIVE":
        return renderFoundContent(); // Assuming archive displays found content
      case "VIEW CICS":
        return renderCICSContent();
      default:
        return <p>No information available.</p>;
    }
  };

  const renderButton = () => {
    if (activeTab === "FOUND ITEMS" && item.status === "Matched") {
      return (
        <p className="text-black-600 font-medium">
          Cancel match in the <strong>Matches</strong> tab to claim.
        </p>
      );
    }

    switch (activeTab) {
      case "FOUND ITEMS":
        return (
          <button
            onClick={() => setClaimFormOpen(true)} // Open the claim form
            className="cursor-pointer px-4 py-2 bg-blue-500 text-white rounded-3xl hover:bg-blue-600"
          >
            Claim
          </button>
        );
      case "POTENTIAL MATCHES":
        return (
          <div className="flex justify-between">
            {/* Cancel Match Button (Left) */}
            <button
              onClick={cancelMatch}
              className="cursor-pointer px-4 py-2 bg-red-500 text-white rounded-3xl hover:bg-red-600"
            >
              Cancel Match
            </button>

            {/* Mark as Claimed Button (Right) */}
            <button
              onClick={() => setMatchClaimFormOpen(true)}
              className="cursor-pointer px-4 py-2 bg-green-500 text-white rounded-3xl hover:bg-green-600"
            >
              Claim
            </button>
          </div>
        );

      case "LOST ITEMS":
      case "ARCHIVE":
        return null; // No button for these cases
      default:
        return null;
    }
  };

  const startScanner = () => {
    setShowScanner(true);
    requestAnimationFrame(() => {
      if (scanner) {
        scanner.clear();
      }

      const newScanner = new Html5QrcodeScanner("qr-reader", {
        fps: 10,
        qrbox: { width: 300, height: 300 },
      });

      setScanner(newScanner);

      newScanner.render(
        async (decodedText) => {
          const idNumber = decodedText.replace(/\D/g, "").substring(0, 10);
          console.log("Original decoded text:", decodedText);
          console.log("Extracted ID (first 10 digits):", idNumber);

          setClaimedByID(idNumber); // Auto-fill ID field
          setShowScanner(false);

          try {
            const response = await fetch(`${API_URL}/api/users/id/${idNumber}`);

            if (!response.ok) {
              throw new Error(
                `Server responded with status: ${response.status}`
              );
            }

            const responseData = await response.json();
            console.log("User data:", responseData);

            // Check if the response has the 'exists' property (indicating it's using the format {exists, data})
            if (responseData.hasOwnProperty("exists")) {
              if (responseData.exists && responseData.data) {
                setClaimedByName(responseData.data.fullName || "");

                if (!responseData.data.fullName) {
                  console.warn("User found but no name detected");
                  alert("User found, but please enter the name manually.");
                }
              } else {
                alert("User not found!");
              }
            } else {
              // Direct data format (no exists/data wrapper)
              if (responseData && responseData.fullName) {
                setClaimedByName(responseData.fullName);
              } else {
                console.warn("User found but no name detected");
                alert("User found, but please enter the name manually.");
              }
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
            alert(`Failed to fetch user information: ${error.message}`);
          }
          newScanner.clear();
          setScanner(null);
        },
        (errorMessage) => {
          console.log("QR Scan error:", errorMessage);
        }
      );
    });
  };

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 flex justify-center items-center bg-black/50 z-50">
        <div className="bg-white rounded-lg p-6 shadow-lg w-1/3 relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="cursor-pointer absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>

          {/* Container for Left and Right Sections */}
          <div className="flex space-x-0">
            {/* Left Section: Item Details */}
            <div className="w-1/2">
              <div className="text-sm text-gray-700 space-y-2">
                {renderContent()}
              </div>
            </div>

            {/* Right Section: Item Image */}
            <div className="w-1/2 flex justify-center items-center">
              <img
                src={item.photoURL || "https://i.imgur.com/R6u77UJ.png"}
                alt="Item"
                className="w-38 h-38 object-cover rounded-lg shadow-md"
              />
            </div>
          </div>

          {/* Conditional Button */}
          <div className="mt-4 text-right">{renderButton()}</div>
        </div>
      </div>

      {isMatchClaimFormOpen && (
        <div className="fixed inset-0 flex justify-center items-center bg-black/50 z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-1/3 relative">
            <button
              onClick={() => setMatchClaimFormOpen(false)}
              className="cursor-pointer absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <h2 className="text-lg font-bold mb-4 text-gray-700">Claimed by</h2>
            <form onSubmit={handleMatchClaimSubmit}>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={claimedByName}
                  onChange={(e) => setClaimedByName(e.target.value)}
                  onBlur={fetchUserDataByName} // Fetch the number when user stops typing
                  className="w-full p-2 border rounded-lg"
                  maxLength="100"
                  required
                />
                <input
                  type="text"
                  placeholder="Employee/Student No."
                  value={claimedByID}
                  onChange={(e) => {
                    if (!isIDLocked) {
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10);
                      setClaimedByID(value);
                    }
                  }}
                  onBlur={() => fetchUserDataByID(claimedByID)} // Fetch the full name when ID is entered first
                  className={`w-full p-2 border rounded-lg ${isIDLocked ? "bg-gray-100" : ""}`}
                  required
                  readOnly={isIDLocked}
                />
                <div className="flex justify-end items-center gap-2">
                  <button
                    onClick={startScanner}
                    type="button"
                    className="cursor-pointer p-1 text-gray-700 hover:text-gray-950 transition"
                  >
                    <QrCodeIcon className="cursor-pointer w-7 h-7" />
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer px-4 py-2 bg-green-500 text-white rounded-3xl hover:bg-green-600 flex items-center gap-2"
                  >
                    Claim
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isClaimFormOpen && (
        <div className="fixed inset-0 flex justify-center items-center bg-black/50 z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-1/3 relative min-h-[310px] h-auto">
            <button
              onClick={() => setClaimFormOpen(false)}
              className="cursor-pointer absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <h2 className="text-lg font-bold mb-4 text-gray-700">Claimed by</h2>
            <form onSubmit={handleClaimSubmit}>
              <div className="space-y-4">
                {/* Full Name Input */}
                <input
                  type="text"
                  placeholder="Full Name"
                  value={claimedByName}
                  onChange={(e) => setClaimedByName(e.target.value)}
                  onBlur={fetchUserDataByName} // Fetch ID when user finishes typing name
                  className="w-full p-2 border rounded-lg"
                  maxLength="100"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  {claimedByName.length}/100 characters
                </p>

                {/* Student Number Input */}
                <input
                  type="text"
                  placeholder="Employee/Student No."
                  value={claimedByID}
                  onChange={(e) => {
                    if (!isIDLocked) {
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10);
                      setClaimedByID(value);
                    }
                  }}
                  onBlur={(e) => fetchUserDataByID(e.target.value)} // Fetch name when user finishes typing ID
                  className={`w-full p-2 border rounded-lg ${isIDLocked ? "bg-gray-100" : ""}`}
                  required
                  readOnly={isIDLocked}
                />
                {claimedByID.length > 0 && claimedByID.length !== 10 && (
                  <p className="text-sm text-red-600">
                    Student number must be exactly 10 digits.
                  </p>
                )}

                {/* Flex Container for Claim, Clear, and QR Code */}
                <div className="flex justify-end items-center gap-2">
                  {/* Clickable QR Code Icon */}
                  <button
                    onClick={startScanner}
                    type="button"
                    className="cursor-pointer p-1 text-gray-700 hover:text-gray-950 transition"
                  >
                    <QrCodeIcon className="cursor-pointer w-7 h-7" />
                  </button>

                  {/* Clear Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setClaimedByName("");
                      setClaimedByID("");
                      setIsIDLocked(false);
                    }}
                    className="cursor-pointer px-4 py-2 bg-gray-400 text-white rounded-3xl hover:bg-gray-500"
                  >
                    Clear
                  </button>

                  {/* Claim Button */}
                  <button
                    type="submit"
                    className="cursor-pointer px-4 py-2 bg-blue-500 text-white rounded-3xl hover:bg-blue-600"
                  >
                    Claim
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {showScanner && (
        <div className="fixed inset-0 flex justify-center items-center bg-black/75 z-[60]">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Scan QR Code</h3>
              <button
                onClick={() => {
                  setShowScanner(false);
                  if (scanner) {
                    scanner.clear();
                    setScanner(null);
                  }
                }}
                className="cursor-pointer text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div id="qr-reader" className="w-[350px] mx-auto"></div>
          </div>
        </div>
      )}
    </>
  );
};

export default ItemInformation;
