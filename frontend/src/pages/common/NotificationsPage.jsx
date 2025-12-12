// src/pages/common/NotificationsPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import notificationService from "../../services/notificationService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Pagination from "../../components/common/Pagination";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { formatDistanceToNow } from "date-fns";
import { CheckCircleIcon, EyeIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  const NOTIFICATIONS_PER_PAGE = 10;

  const fetchNotifications = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await notificationService.getNotifications({
        page,
        limit: NOTIFICATIONS_PER_PAGE,
      });
      if (response.success) {
        setNotifications(response.notifications);
        setPagination(response.pagination);
        setCurrentPage(page);
      } else {
        throw new Error(response.message || "Failed to fetch notifications");
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
      setError(err.message || "Could not load notifications.");
      toast.error(err.message || "Could not load notifications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(currentPage);
  }, [fetchNotifications, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleMarkRead = async (id) => {
    setActionLoading(id);
    try {
      const response = await notificationService.markNotificationAsRead(id);
      if (response.success) {
        toast.success("Marked as read");
        setNotifications((prev) =>
          prev.map((notif) =>
            notif._id === id
              ? { ...notif, isRead: true, readAt: new Date() } // Ensure readAt is updated locally
              : notif
          )
        );
      } else {
        if (response.message?.includes("already marked")) {
          toast.success(response.message);
          setNotifications((prev) =>
            prev.map((notif) =>
              notif._id === id ? { ...notif, isRead: true } : notif
            )
          );
        } else {
          throw new Error(response.message || "Failed to mark as read");
        }
      }
    } catch (err) {
      console.error("Mark read error:", err);
      toast.error(err.message || "Could not mark as read.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    setActionLoading("all");
    try {
      const response = await notificationService.markAllNotificationsAsRead();
      if (response.success) {
        toast.success(
          `${response.count || "All"} notifications marked as read`
        );
        fetchNotifications(1); // Refetch page 1
      } else {
        throw new Error(response.message || "Failed to mark all as read");
      }
    } catch (err) {
      console.error("Mark all read error:", err);
      toast.error(err.message || "Could not mark all as read.");
    } finally {
      setActionLoading(false);
    }
  };

  // Function to generate link based on notification type and related ID
  const getRelatedLink = (notif) => {
    // ... (keep existing logic, enhance with role check later if needed)
    if (!notif.relatedTo?.model || !notif.relatedTo?.id) {
      return null;
    }
    const { model, id } = notif.relatedTo;
    switch (model) {
      case "Appointment":
        return `/patient/appointments/${id}`;
      case "Payment":
        return `/patient/payments`;
      case "LabTest":
        return `/patient/lab-results`;
      case "RadiologyReport":
        return `/patient/radiology-results`;
      case "MedicalRecord":
        return `/patient/medical-records`;
      case "Referral":
        return `/receptionist/referrals`;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Notifications</h1>
        <Button
          onClick={handleMarkAllRead}
          disabled={isLoading || actionLoading === "all"}
          isLoading={actionLoading === "all"}
          variant="outline"
          size="sm"
        >
          Mark All As Read
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <p className="text-center text-danger-500 py-4">{error}</p>
      ) : notifications.length > 0 ? (
        <div className="space-y-4">
          {notifications.map((notif) => {
            const relatedLink = getRelatedLink(notif);
            // --- FORMATTING CHANGE HERE ---
            const timeAgo = formatDistanceToNow(new Date(notif.createdAt), {
              addSuffix: true,
            });
            const readTimeAgo = notif.readAt
              ? formatDistanceToNow(new Date(notif.readAt), { addSuffix: true })
              : null;
            // --- END FORMATTING CHANGE ---

            return (
              <Card
                key={notif._id}
                className={`border-l-4 ${
                  notif.isRead ? "border-gray-300" : "border-primary-500"
                }`}
              >
                <div className="flex flex-col md:flex-row justify-between md:items-start">
                  <div className="flex-1 mb-3 md:mb-0 md:mr-4">
                    <h3
                      className={`font-semibold ${
                        notif.isRead ? "text-gray-700" : "text-gray-900"
                      }`}
                    >
                      {notif.title}
                    </h3>
                    <p
                      className={`text-sm ${
                        notif.isRead ? "text-gray-500" : "text-gray-700"
                      }`}
                    >
                      {notif.message}
                    </p>
                    {/* --- DISPLAY CHANGE HERE --- */}
                    <p className="text-xs text-gray-400 mt-1">
                      {timeAgo}
                      {readTimeAgo && ` (Read: ${readTimeAgo})`}
                    </p>
                    {/* --- END DISPLAY CHANGE --- */}
                    {/* Priority Indicator (Optional) */}
                    {notif.priority && (
                      <span /* ... rest of the priority span */>
                        {notif.priority}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {relatedLink && (
                      <Link to={relatedLink} title="View Related Item">
                        <Button size="sm" variant="ghost" icon={EyeIcon} />
                      </Link>
                    )}
                    {!notif.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkRead(notif._id)}
                        isLoading={actionLoading === notif._id}
                        disabled={!!actionLoading}
                        icon={CheckCircleIcon}
                        title="Mark as Read"
                      />
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-4">
          No notifications found.
        </p>
      )}

      {pagination && pagination.pages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.pages}
          onPageChange={handlePageChange}
          itemsPerPage={pagination.limit}
          totalItems={pagination.total}
        />
      )}
    </div>
  );
};

export default NotificationsPage;
