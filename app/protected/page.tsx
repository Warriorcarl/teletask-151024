"use client";

import FetchDataSteps from "@/components/tutorial/fetch-data-steps";
import { InfoIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient as createClientClient } from "@/utils/supabase/client"; // Supabase client for frontend
import { User } from "@supabase/supabase-js"; // Import User type from Supabase

export default function ProtectedPage() {
  const supabaseClient = createClientClient(); // Initialize client for fetching/updating channels

  // State untuk input, channel, dan notifikasi
  const [channels, setChannels] = useState([]); // Untuk menyimpan daftar channel
  const [channelInput, setChannelInput] = useState({ name: "", url: "" }); // Untuk form input channel baru
  const [keyword, setKeyword] = useState(""); // Untuk kata kunci filter pesan
  const [filteredMessages, setFilteredMessages] = useState([]); // Pesan yang sudah difilter
  const [loading, setLoading] = useState(true); // State loading untuk pengambilan data
  const [user, setUser] = useState<User | null>(null); // State untuk user yang sedang login
  const [notification, setNotification] = useState({ message: "", type: "" }); // Untuk notifikasi

  // Mengambil user yang sedang login
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabaseClient.auth.getUser();

      if (error) {
        console.error("Error fetching user: ", error);
      } else {
        setUser(data?.user);
      }
    };

    fetchUser();
  }, []);

  // Fungsi untuk mengambil channel dari Supabase
  const fetchChannels = async () => {
    setLoading(true);
    if (!user) return; // Hanya lanjutkan jika user sudah ada
    const { data, error } = await supabaseClient
      .from("channels")
      .select("*")
      .eq("user_id", user?.id); // Pastikan hanya mengambil channel milik user yang sedang login

    if (error) {
      console.error("Error fetching channels:", error);
      setNotification({ message: "Error fetching channels", type: "error" });
    } else {
      setChannels(data); // Update state dengan data channel
    }
    setLoading(false);
  };

  // Panggil fetchChannels setelah user login
  useEffect(() => {
    if (user) {
      fetchChannels();
    }
  }, [user]);

  // Fungsi untuk menambah channel
  const handleAddChannel = async () => {
    if (!channelInput.name || !channelInput.url) {
      setNotification({ message: "Channel name and URL are required", type: "error" });
      return;
    }

    if (!user) {
      console.error("User not found, unable to add channel");
      return;
    }

    try {
      // Validasi apakah URL sudah ada di database, meskipun dengan nama berbeda
      const { data: existingChannels, error: checkError } = await supabaseClient
        .from("channels")
        .select("*")
        .eq("user_id", user.id)
        .eq("channel_url", channelInput.url); // Validasi berdasarkan URL

      if (checkError) {
        console.error("Error checking existing channels:", checkError);
        setNotification({ message: "Error checking existing channels", type: "error" });
        return;
      }

      if (existingChannels.length > 0) {
        // Jika ada channel dengan URL yang sama, tampilkan pesan error
        setNotification({ message: "This URL already exists in your channels", type: "error" });
        return;
      }

      // Tambahkan channel jika tidak ada duplikasi URL
      const { error } = await supabaseClient.from("channels").insert({
        user_id: user.id, // Pastikan `user_id` disertakan dalam query insert
        channel_name: channelInput.name,
        channel_url: channelInput.url,
      });

      if (error) {
        console.error("Error adding channel:", error);
        setNotification({ message: "Error adding channel: " + error.message, type: "error" });
      } else {
        setChannelInput({ name: "", url: "" });
        setNotification({ message: "Channel added successfully", type: "success" });
        fetchChannels(); // Panggil ulang fungsi fetchChannels untuk mengambil data terbaru
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setNotification({ message: "Unexpected error occurred", type: "error" });
    }
  };

  // Fungsi untuk menghapus channel
  const handleDeleteChannel = async (channelId) => {
    const { error } = await supabaseClient
      .from("channels")
      .delete()
      .eq("id", channelId);

    if (error) {
      console.error("Error deleting channel:", error);
      setNotification({ message: "Error deleting channel: " + error.message, type: "error" });
    } else {
      setNotification({ message: "Channel deleted successfully", type: "success" });
      fetchChannels(); // Panggil ulang fungsi fetchChannels untuk memperbarui data setelah penghapusan
    }
  };

  // Fungsi untuk menghilangkan notifikasi setelah beberapa detik
  useEffect(() => {
    if (notification.message) {
      const timeout = setTimeout(() => setNotification({ message: "", type: "" }), 3000);
      return () => clearTimeout(timeout); // Membersihkan timeout jika notifikasi berubah
    }
  }, [notification]);

  // Fungsi untuk filter pesan berdasarkan kata kunci
  const fetchFilteredMessages = async () => {
    if (!keyword.trim()) {
      setNotification({ message: "Please enter a keyword to filter messages.", type: "error" });
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from("telegram_messages")
        .select("*")
        .ilike("message_content", `%${keyword}%`);

      if (error) {
        console.error("Error fetching messages:", error);
        setNotification({ message: "Error fetching messages", type: "error" });
      } else if (data.length === 0) {
        setNotification({ message: "No messages found for the given keyword", type: "info" });
      } else {
        setFilteredMessages(data);
      }
    } catch (err) {
      console.error("Unexpected error fetching messages:", err);
      setNotification({ message: "Unexpected error fetching messages", type: "error" });
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-12 p-4">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center shadow-md">
          <InfoIcon size="16" strokeWidth={2} />
          This is a protected page that you can only see as an authenticated user
        </div>
      </div>

      {/* Bagian untuk notifikasi */}
      {notification.message && (
        <div
          className={`p-4 rounded text-white mb-4 ${
            notification.type === "error" ? "bg-red-500" : "bg-green-500"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Bagian untuk CRUD Channel */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded shadow-md">
        <h2 className="font-bold text-2xl mb-4">Manage Telegram Channels</h2>
        <input
          type="text"
          name="name"
          placeholder="Channel Name"
          value={channelInput.name}
          onChange={(e) => setChannelInput({ ...channelInput, name: e.target.value })}
          className="input p-2 border border-gray-300 rounded w-full mb-2 focus:outline-none focus:ring focus:border-blue-300"
        />
        <input
          type="text"
          name="url"
          placeholder="Channel URL"
          value={channelInput.url}
          onChange={(e) => setChannelInput({ ...channelInput, url: e.target.value })}
          className="input p-2 border border-gray-300 rounded w-full mb-4 focus:outline-none focus:ring focus:border-blue-300"
        />
        <button
          onClick={handleAddChannel}
          className="bg-blue-500 text-white p-2 rounded shadow hover:bg-blue-600 transition-all"
        >
          Add Channel
        </button>

        <ul className="mt-4">
          {channels.map((channel) => (
            <li
              key={channel.id}
              className="flex justify-between items-center p-2 border-b border-gray-200"
            >
              <div>
                <span className="font-semibold">{channel.channel_name}</span> - {channel.channel_url}
              </div>
              <button
                onClick={() => handleDeleteChannel(channel.id)}
                className="text-red-500 bg-transparent hover:bg-red-500 hover:text-white p-1 rounded transition-all"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Bagian untuk Filter Pesan */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded shadow-md">
        <h2 className="font-bold text-2xl mb-4">Filter Telegram Messages</h2>
        <input
          type="text"
          placeholder="Enter keyword (e.g., testnet, FCFS)"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="input p-2 border border-gray-300 rounded w-full mb-4 focus:outline-none focus:ring focus:border-blue-300"
        />
        <button
          onClick={fetchFilteredMessages}
          className="bg-green-500 text-white p-2 rounded shadow hover:bg-green-600 transition-all"
        >
          Fetch Messages
        </button>

        {filteredMessages.length > 0 ? (
          <ul className="mt-4">
            {filteredMessages.map((message) => (
              <li key={message.id} className="flex gap-4 items-center p-2 border-b border-gray-200">
                <p>{message.message_content}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 mt-4">No messages found.</p>
        )}
      </div>
    </div>
  );
}
