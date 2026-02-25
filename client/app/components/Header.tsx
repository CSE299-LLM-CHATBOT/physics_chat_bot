import React, { useState } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

interface HeaderProps {
  onDeleteSession: () => void;
  session: string;
}

const Header: React.FC<HeaderProps> = ({ onDeleteSession, session }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  // Function to handle delete action
  const handleDeleteSession = async () => {
    try {
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/delete_session/${session}`,
        {
          data: { session_id: window.location.pathname.split("/")[1] },
        }
      );

      if (response.status === 200) {
        onDeleteSession();
        toast.success("Session deleted successfully.");
      } else {
        toast.error("Failed to delete the session.");
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("An error occurred while deleting the session.");
    }
    setShowConfirm(false); // Close pop-up after deletion attempt
  };

  return (
    <div className="fixed top-0 w-full z-10 h-20">
      <Toaster position="top-right" reverseOrder={false} />

      <div className="flex justify-between items-center h-full px-4">
        <p className="text-[30px] font-bold">
          <Link href="/">Physics ChatBot</Link>
        </p>

        <Button className="bg-red-500" onClick={() => setShowConfirm(true)}>
          Delete
        </Button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 flex items-start justify-end bg-black bg-opacity-70 backdrop-blur-lg z-20">
          <div className="bg-white rounded-lg shadow-lg mt-8 p-6 mr-8 max-w-sm text-center">
            <p className="text-lg font-semibold mb-4">
              Are you sure you want to delete this session?
            </p>
            <div className="flex justify-around">
              <Button className="bg-red-500" onClick={handleDeleteSession}>
                Yes, Delete
              </Button>
              <Button
                className="bg-gray-300"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;
