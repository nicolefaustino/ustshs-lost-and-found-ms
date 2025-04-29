import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { MagnifyingGlassIcon, InformationCircleIcon } from "@heroicons/react/24/outline"
import { FunnelIcon, ArrowDownOnSquareIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid"
import ItemInformation from "../../components/admin/ItemInformation"
import AdminSidebar from "../../components/admin/AdminSidebar"
import ItemFilter from "../../components/admin/ItemFilter"
import { useNavigate, useLocation } from "react-router-dom"
import QRCode from "qrcode"
import { Timestamp } from "firebase/firestore"

const initialFilterState = {
  date: "",
  orderBy: "",
  category: "",
  status: "",
}

const tabItems = ["FOUND ITEMS", "LOST ITEMS", "POTENTIAL MATCHES", "ARCHIVE", "VIEW CICS"]

const formatTimestamp = (timestamp) => {
  if (timestamp instanceof Timestamp) {
    const date = new Date(timestamp.toDate())
    return date.toLocaleDateString()
  } else if (timestamp && timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toLocaleDateString()
  } else if (timestamp && typeof timestamp === "string") {
    const date = new Date(timestamp)
    return date.toLocaleDateString()
  }
  return "N/A"
}

function AdminItems() {
  const navigate = useNavigate()
  const [isItemInformationOpen, setIsItemInformationOpen] = useState(false)
  const [isItemFilterOpen, setIsItemFilterOpen] = useState(false)
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "FOUND ITEMS")
  const [foundItems, setFoundItems] = useState([])
  const [lostItems, setLostItems] = useState([])
  const [matchItems, setMatchItems] = useState([])
  const [archiveItems, setArchiveItems] = useState([])
  const [cicsItems, setCicsItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentItem, setCurrentItem] = useState(null)
  const [filters, setFilters] = useState(initialFilterState)
  const [categories, setCategories] = useState([
    "Personal Belongings",
    "Electronics",
    "School Supplies & Stationery",
    "Tumblers & Food Containers",
    "Clothing & Apparel",
    "Money & Valuables",
    "Documents",
    "Other",
  ])
  const [statuses, setStatuses] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [qrCodes, setQrCodes] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const API_URL = "https://ust-shs-lost-and-found-management-system.onrender.com"

  // Check for search parameter in URL on component mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const searchValue = searchParams.get("search")
    if (searchValue) {
      setSearchTerm(searchValue)
      // Focus on the search input to make it clear to the user
      const searchInput = document.querySelector('input[type="search"]')
      if (searchInput) {
        searchInput.focus()
      }
    }
  }, [location.search]) // This will run when the URL changes

  const getActiveEndpoint = useCallback(() => {
    switch (activeTab) {
      case "FOUND ITEMS":
        return "found-items"
      case "LOST ITEMS":
        return "lost-items"
      case "POTENTIAL MATCHES":
        return "matches"
      case "ARCHIVE":
        return "archives"
      case "VIEW CICS":
        return "found-items" // Changed to use the main found-items endpoint
      default:
        return ""
    }
  }, [activeTab])

  const getDateFieldForTab = useCallback((tab) => {
    switch (tab) {
      case "FOUND ITEMS":
        return "dateFound"
      case "LOST ITEMS":
        return "dateLost"
      case "POTENTIAL MATCHES":
        return "matchTimestamp"
      case "ARCHIVE":
        return "date"
      case "VIEW CICS":
        return "dateFound"
      default:
        return "date"
    }
  }, [])

  const generateQRCode = useCallback(async (item) => {
    try {
      // Get the appropriate ID based on the item type
      const itemId = item.foundID || item.lostID || item.matchId || item.id

      // Create a URL that will open the app with the search term pre-filled
      // Use the full URL including the current path to ensure it opens in the correct page
      const currentPath = window.location.pathname
      const baseUrl = `https://ust-shs-lost-and-found.netlify.app${currentPath}`
      const qrUrl = `${baseUrl}?search=${itemId}`

      const qrCodeDataURL = await QRCode.toDataURL(qrUrl)
      setQrCodes((prevQrCodes) => ({
        ...prevQrCodes,
        [item.id || item.matchId]: qrCodeDataURL,
      }))
    } catch (error) {
      console.error("Error generating QR code:", error)
    }
  }, [])

  const handleDownloadPDF = async () => {
    try {
      // Gather all items that have been processed and include their QR codes
      const itemsWithQR = [...foundItems, ...lostItems, ...matchItems, ...archiveItems, ...cicsItems].map((item) => ({
        id: item.foundID || item.lostID || item.matchId || item.id, // Get correct ID
        qrCode: qrCodes[item.foundID || item.lostID || item.matchId || item.id] || "", // Get stored QR code
      }));
  
      console.log("📄 Sending items to generate PDF:", itemsWithQR);
  
      // Send data to backend
      const response = await fetch(`${API_URL}/api/generate-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: itemsWithQR }), // Send items with QR codes
      });
  
      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`);
      }
  
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
  
      a.href = url;
      a.download = "LostAndFoundReport.pdf";
      document.body.appendChild(a);
      a.click();
  
      // Clean up
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("❌ Error downloading PDF:", error);
      alert("Failed to download PDF. Please try again later.");
    }
  };
  

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const endpoint = getActiveEndpoint()
    const dateField = getDateFieldForTab(activeTab)

    console.log("Current activeTab:", activeTab)
    console.log("Endpoint:", endpoint)
    console.log("DateField:", dateField)

    try {
      const response = await axios.get(`${API_URL}/api/${endpoint}`, {
        params: {
          dateField,
          date: filters.date || "",
          orderBy: filters.orderBy || "",
          category: filters.category || "",
          status: filters.status || "",
          department: activeTab === "VIEW CICS" ? "CICS" : undefined,
        },
      })

      let processedData = response.data
      console.log(`Fetched ${activeTab} data:`, processedData) // Add this line for debugging

      if (activeTab === "FOUND ITEMS" || activeTab === "LOST ITEMS" || activeTab === "ARCHIVE") {
        processedData = processedData.filter((item) => item.department === "SHS")
      }

      switch (activeTab) {
        case "FOUND ITEMS":
          setFoundItems(processedData)
          processedData.forEach(generateQRCode)
          break
        case "LOST ITEMS":
          setLostItems(processedData)
          processedData.forEach(generateQRCode)
          break
        case "POTENTIAL MATCHES":
          // Enhanced match items processing
          const matchItemsData = processedData.map((item) => {
            const processed = {
              ...item,
              id: item.matchId || item.id || item.newMatchID,
              matchId: item.matchId || item.newMatchID || item.id,
              lostID: item.lostID || item.lost_id,
              foundID: item.foundID || item.found_id,
              matchTimestamp: formatTimestamp(item.matchTimestamp || item.match_timestamp || item.dateMatched),
            }
            console.log("Processed match item:", processed)
            return processed
          })
          console.log("Processed match items data:", matchItemsData)
          setMatchItems(matchItemsData)
          matchItemsData.forEach(generateQRCode)
          break
        case "ARCHIVE":
          setArchiveItems(Array.isArray(processedData) ? processedData : [])
          if (Array.isArray(processedData)) {
            processedData.forEach(generateQRCode)
          }
          break
        case "VIEW CICS":
          const cicsItemsData = processedData
            .filter((item) => item.department === "CICS")
            .map((item) => ({
              ...item,
              id: item.id || item.foundID,
              dateFound: formatTimestamp(item.dateFound),
            }))
          setCicsItems(cicsItemsData)
          cicsItemsData.forEach(generateQRCode)
          break
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error)
      console.error("Error details:", error.response?.data)
      // Set empty array if there's an error
      switch (activeTab) {
        case "FOUND ITEMS":
          setFoundItems([])
          break
        case "LOST ITEMS":
          setLostItems([])
          break
        case "POTENTIAL MATCHES":
          setMatchItems([])
          break
        case "ARCHIVE":
          setArchiveItems([])
          break
        case "VIEW CICS":
          setCicsItems([])
          break
      }
    } finally {
      setLoading(false)
    }
  }, [activeTab, filters, getActiveEndpoint, getDateFieldForTab, generateQRCode])

  useEffect(() => {
    fetchItems()
    // Don't reset search term here to preserve URL search params
  }, [fetchItems])

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/statuses`)
        setStatuses(response.data)
      } catch (error) {
        console.error("Error fetching statuses:", error)
      }
    }
    fetchStatuses()
  }, [])

  const handleItemClick = (item) => {
    setCurrentItem(item)
    setIsItemInformationOpen(true)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
  }

  const handleApplyFilters = (newFilters) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      ...newFilters,
    }))
  }

  const handleResetFilters = () => {
    setFilters(initialFilterState)
  }

  const filterItems = (items) => {
    if (!searchTerm) return items
    return items.filter((item) =>
      Object.values(item).some(
        (value) => typeof value === "string" && value.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    )
  }

  const getPaginatedItems = (items) => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return items.slice(startIndex, endIndex)
  }

  const renderPagination = (items) => {
    const totalPages = Math.ceil(items.length / itemsPerPage)

    return (
      <div className="flex justify-center items-center mt-4 mb-4 space-x-2">
        {/* Previous Button */}
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className={`p-2 rounded-full ${
            currentPage === 1 ? "bg-gray-200 cursor-not-allowed" : "bg-white hover:bg-gray-100"
          } border border-gray-300`}
        >
          <ChevronLeftIcon className="cursor-pointer w-2 h-2 text-gray-700" />
        </button>

        {/* Page Indicator */}
        <span className="px-4 py-2 text-sm font-medium text-gray-700">
          Page {currentPage} of {totalPages}
        </span>

        {/* Next Button */}
        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-full ${
            currentPage === totalPages ? "bg-gray-200 cursor-not-allowed" : "bg-white hover:bg-gray-100"
          } border border-gray-300`}
        >
          <ChevronRightIcon className="cursor-pointer w-2 h-2 text-gray-700" />
        </button>
      </div>
    )
  }

  const renderTabContent = () => {
    console.log("renderTabContent called with activeTab:", activeTab)
    if (loading) {
      return <p className="text-center p-4">Loading...</p>
    }

    let filteredItems = []
    switch (activeTab) {
      case "FOUND ITEMS":
        filteredItems = filterItems(foundItems)
        break
      case "LOST ITEMS":
        filteredItems = filterItems(lostItems)
        break
      case "POTENTIAL MATCHES":
        filteredItems = filterItems(matchItems)
        break
      case "ARCHIVE":
        filteredItems = filterItems(archiveItems)
        break
      case "VIEW CICS":
        console.log("CICS items before filtering:", cicsItems)
        filteredItems = filterItems(cicsItems)
        console.log("CICS items after filtering:", filteredItems)
        break
      default:
        return <p className="text-center p-4">No items available.</p>
    }

    if (filteredItems.length === 0) {
      return <p className="text-center p-4">No items found.</p>
    }

    const paginatedItems = getPaginatedItems(filteredItems)

    return (
      <>
        {renderTable(paginatedItems)}
        {renderPagination(filteredItems)}
      </>
    )
  }

  const renderTable = (items) => {
    switch (activeTab) {
      case "FOUND ITEMS":
        return renderFoundItemsTable(items)
      case "LOST ITEMS":
        return renderLostItemsTable(items)
      case "POTENTIAL MATCHES":
        return renderMatchItemsTable(items)
      case "ARCHIVE":
        return renderArchiveItemsTable(items)
      case "VIEW CICS":
        return renderCICSItemsTable(items)
      default:
        return <p className="text-center p-4">No items available.</p>
    }
  }

  const renderFoundItemsTable = (items) => {
    return (
      <table className="w-full">
        <thead className="bg-gray-50 text-sm text-gray-600">
          <tr>
            <th className="px-6 py-3 text-left">Item ID</th>
            <th className="px-6 py-3 text-left">Item Name</th>
            <th className="px-6 py-3 text-left">Item Category</th>
            <th className="px-6 py-3 text-left">Status</th>
            <th className="px-6 py-3 text-left">Location Found</th>
            <th className="px-6 py-3 text-left">Date Found</th>
            <th className="px-6 py-3 text-left">QR Code</th>
            <th className="px-6 py-3 text-left"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item) => {
            if (item.id === "DO NOT DELETE") return null
            return (
              <tr key={item.id}>
                <td className="px-6 py-2 text-sm">{item.foundID}</td>
                <td className="px-6 py-2 text-sm">{item.found_item_name}</td>
                <td className="px-6 py-2 text-sm">{item.category}</td>
                <td className="px-6 py-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === "Matched"
                        ? "bg-green-500 text-white"
                        : item.status === "Pending"
                          ? "bg-red-500 text-white"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-2 text-sm">{item.locationFound}</td>
                <td className="px-6 py-2 text-sm">{item.dateFound}</td>
                <td className="px-6 py-2 text-sm">
                  {qrCodes[item.id] && (
                    <img
                      src={qrCodes[item.id] || "/placeholder.svg"}
                      alt="QR Code"
                      className="w-8 h-8"
                      title={`Scan to search for item: ${item.foundID || item.id}`}
                    />
                  )}
                </td>
                <td>
                  <button onClick={() => handleItemClick(item)} className="text-gray-400 hover:text-gray-600">
                    <InformationCircleIcon className="cursor-pointer w-5 h-5" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  const renderLostItemsTable = (items) => {
    return (
      <table className="w-full">
        <thead className="bg-gray-50 text-sm text-gray-600">
          <tr>
            <th className="px-6 py-3 text-left">Item ID</th>
            <th className="px-6 py-3 text-left">Item Name</th>
            <th className="px-6 py-3 text-left">Item Category</th>
            <th className="px-6 py-3 text-left">Status</th>
            <th className="px-6 py-3 text-left">Location Lost</th>
            <th className="px-6 py-3 text-left">Date Lost</th>
            <th className="px-6 py-3 text-left"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item) => {
            if (item.id === "DO NOT DELETE") return null
            return (
              <tr key={item.id}>
                <td className="px-6 py-2 text-sm">{item.lostID}</td>
                <td className="px-6 py-2 text-sm">{item.lost_item_name}</td>
                <td className="px-6 py-2 text-sm">{item.category}</td>
                <td className="px-6 py-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === "Matched"
                        ? "bg-green-500 text-white"
                        : item.status === "Pending"
                          ? "bg-red-500 text-white"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-2 text-sm">{item.locationLost}</td>
                <td className="px-6 py-2 text-sm">{item.dateLost}</td>
                <td>
                  <button onClick={() => handleItemClick(item)} className="text-gray-400 hover:text-gray-600">
                    <InformationCircleIcon className="cursor-pointer w-5 h-5" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  const renderMatchItemsTable = (items) => {
    console.log("Rendering match items:", items)

    if (!items || items.length === 0) {
      return <p className="text-center p-4">No matched items found.</p>
    }

    return (
      <table className="w-full">
        <thead className="bg-gray-50 text-sm text-gray-600">
          <tr>
            <th className="px-6 py-3 text-left">Match ID</th>
            <th className="px-6 py-3 text-left">Lost ID</th>
            <th className="px-6 py-3 text-left">Found ID</th>
            <th className="px-6 py-3 text-left">Date Matched</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item) => {
            if (item.id === "DO NOT DELETE") return null
            console.log("Rendering match item:", item)
            return (
              <tr key={item.id || item.matchId || `match-${Math.random()}`}>
                <td className="px-6 py-2 text-sm">{item.matchId || "N/A"}</td>
                <td className="px-6 py-2 text-sm">{item.lostID || "N/A"}</td>
                <td className="px-6 py-2 text-sm">{item.foundID || "N/A"}</td>
                <td className="px-6 py-2 text-sm">{item.matchTimestamp || "N/A"}</td>

                <td>
                  <button onClick={() => handleItemClick(item)} className="text-gray-400 hover:text-gray-600">
                    <InformationCircleIcon className="cursor-pointer w-5 h-5" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  const renderArchiveItemsTable = (items) => {
    if (!items || items.length === 0) {
      return <p className="text-center p-4">No archived items found.</p>
    }

    return (
      <div className="overflow-x-auto">
        {" "}
        {/* Ensures table doesn't get cut off */}
        <table className="w-full min-w-max">
          {" "}
          {/* Forces full width */}
          <thead className="bg-gray-50 text-sm text-gray-600">
            <tr>
              <th className="px-6 py-3 text-left">Item ID</th>
              <th className="px-6 py-3 text-left">Item Name</th>
              <th className="px-6 py-3 text-left">Item Category</th>
              <th className="px-6 py-3 text-left">Location</th>
              <th className="px-6 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => {
              if (item.id === "DO NOT DELETE") return null
              return (
                <tr key={item.id || `archive-${Math.random()}`}>
                  <td className="px-6 py-2 text-sm">{item.foundID || item.lostID || "N/A"}</td>
                  <td className="px-6 py-2 text-sm">{item.found_item_name || item.lost_item_name || "N/A"}</td>
                  <td className="px-6 py-2 text-sm">{item.category || "N/A"}</td>
                  <td className="px-6 py-2 text-sm">{item.locationFound || item.locationLost || "N/A"}</td>
                  <td className="px-6 py-2 text-sm">{item.dateFound || item.dateLost || "N/A"}</td>
                  <td className="px-6 py-2 text-sm">
                    {" "}
                    {/* Fixed alignment */}
                    <button onClick={() => handleItemClick(item)} className="text-gray-400 hover:text-gray-600">
                      <InformationCircleIcon className="cursor-pointer w-5 h-5" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  const renderCICSItemsTable = (items) => {
    console.log("Rendering CICS table with items:", items)
    if (!items || items.length === 0) {
      return <p className="text-center p-4">No CICS items found.</p>
    }
    return (
      <table className="w-full">
        <thead className="bg-gray-50 text-sm text-gray-600">
          <tr>
            <th className="px-6 py-3 text-left">Item ID</th>
            <th className="px-6 py-3 text-left">Item Name</th>
            <th className="px-6 py-3 text-left">Item Category</th>
            <th className="px-6 py-3 text-left">Date Found</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-6 py-2 text-sm">{item.foundID}</td>
              <td className="px-6 py-2 text-sm">{item.found_item_name}</td>
              <td className="px-6 py-2 text-sm">{item.category}</td>
              <td className="px-6 py-2 text-sm">{item.dateFound}</td>
              <td>
                <button onClick={() => handleItemClick(item)} className="text-gray-400 hover:text-gray-600">
                  <InformationCircleIcon className="cursor-pointer w-5 h-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div className="flex min-h-screen bg-amber-50 overflow-hidden">
      <AdminSidebar className="hidden md:block" />

      <div className="flex-1 p-4 md:p-6 w-full">
        <div className="flex items-center justify-between w-full mb-6">
          <h1 className="text-xl md:text-3xl font-bold text-amber-500 whitespace-nowrap mr-4">LOST & FOUND ITEMS</h1>
          <div className="flex items-center gap-2">
            <button
              className="hidden md:flex text-gray-800 hover:text-gray-950"
              onClick={handleDownloadPDF}
              title="Download Report"
            >
              <ArrowDownOnSquareIcon className="cursor-pointer w-6 h-6" />
            </button>
            <button
              className="flex items-center text-gray-800 hover:text-gray-950"
              onClick={() => setIsItemFilterOpen(true)}
            >
              <FunnelIcon className="cursor-pointer w-5 h-5" />
            </button>
            <div className="relative w-full md:w-64">
              <input
                type="search"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-full bg-gray-200 text-sm"
              />
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-500" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6 overflow-x-auto whitespace-nowrap">
          {tabItems.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                activeTab === tab ? "bg-white shadow-sm" : "text-gray-500 hover:bg-black/10 cursor-pointer"
              }`}
            >
              {tab}
            </button>
          ))}

          {(activeTab === "FOUND ITEMS" || activeTab === "LOST ITEMS") && (
            <button
              onClick={() => navigate(activeTab === "FOUND ITEMS" ? "/add-found" : "/add-lost")}
              className="cursor-pointer ml-auto px-3 md:px-5 py-2 bg-blue-500 text-white rounded-3xl hover:bg-blue-600 text-sm md:text-base whitespace-nowrap"
            >
              {activeTab === "FOUND ITEMS" ? "+ Add Found" : "+ Add Lost"}
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <p className="text-center p-4">Loading...</p>
          ) : (
            <div className="overflow-x-auto">{renderTabContent()}</div>
          )}
        </div>

        <ItemInformation
          isOpen={isItemInformationOpen}
          onClose={() => setIsItemInformationOpen(false)}
          item={currentItem}
          activeTab={activeTab}
        />

        <ItemFilter
          isOpen={isItemFilterOpen}
          onClose={() => setIsItemFilterOpen(false)}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          initialFilters={initialFilterState}
          categories={categories}
          statuses={statuses}
        />
      </div>
    </div>
  )
}

export default AdminItems
