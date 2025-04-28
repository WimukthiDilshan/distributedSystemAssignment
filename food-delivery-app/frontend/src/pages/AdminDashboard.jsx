import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is admin
    if (user && user.role !== 'admin') {
      toast.error('Unauthorized: Admin access only');
      navigate('/');
      return;
    }

    fetchRestaurants();
  }, [user, navigate]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/api/restaurants/admin/all');
      setRestaurants(response.data);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch restaurants');
    } finally {
      setLoading(false);
    }
  };

  const approveRestaurant = async (id) => {
    try {
      await axios.patch(`http://localhost:3000/api/restaurants/admin/approve/${id}`);
      toast.success('Restaurant approved successfully');
      // Update the local state
      setRestaurants(restaurants.map(restaurant => 
        restaurant._id === id 
          ? { ...restaurant, approvalStatus: 'approved' } 
          : restaurant
      ));
    } catch (error) {
      console.error('Error approving restaurant:', error);
      toast.error(error.response?.data?.message || 'Failed to approve restaurant');
    }
  };

  const rejectRestaurant = async (id) => {
    try {
      await axios.patch(`http://localhost:3000/api/restaurants/admin/reject/${id}`);
      toast.success('Restaurant rejected successfully');
      // Update the local state
      setRestaurants(restaurants.map(restaurant => 
        restaurant._id === id 
          ? { ...restaurant, approvalStatus: 'rejected' } 
          : restaurant
      ));
    } catch (error) {
      console.error('Error rejecting restaurant:', error);
      toast.error(error.response?.data?.message || 'Failed to reject restaurant');
    }
  };

  // Function to get badge color based on approval status
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">System Admin Dashboard</h1>
        <Link
          to="/admin/users"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Manage Users
        </Link>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Restaurant Approval Management</h2>
        <p className="mb-4">Approve or reject restaurant registrations. Only approved restaurants will be visible to customers.</p>
      </div>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restaurant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuisine</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creation Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {restaurants.length > 0 ? (
              restaurants.map((restaurant) => (
                <tr key={restaurant._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img 
                          className="h-10 w-10 rounded-full object-cover" 
                          src={restaurant.image ? `http://localhost:3000${restaurant.image}` : 'https://via.placeholder.com/150'} 
                          alt={restaurant.name} 
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{restaurant.name}</div>
                        <div className="text-sm text-gray-500">{restaurant.address?.city}, {restaurant.address?.country}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{restaurant.cuisine}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(restaurant.approvalStatus)} text-white`}>
                      {restaurant.approvalStatus.charAt(0).toUpperCase() + restaurant.approvalStatus.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(restaurant.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {restaurant.approvalStatus === 'pending' && (
                      <>
                        <button
                          onClick={() => approveRestaurant(restaurant._id)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectRestaurant(restaurant._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {restaurant.approvalStatus === 'approved' && (
                      <button
                        onClick={() => rejectRestaurant(restaurant._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Reject
                      </button>
                    )}
                    {restaurant.approvalStatus === 'rejected' && (
                      <button
                        onClick={() => approveRestaurant(restaurant._id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  No restaurants found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 