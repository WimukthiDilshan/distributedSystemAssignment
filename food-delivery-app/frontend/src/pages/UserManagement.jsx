import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const roles = [
    { value: 'customer', label: 'Customer' },
    { value: 'restaurant_admin', label: 'Restaurant Admin' },
    { value: 'delivery_personnel', label: 'Delivery Personnel' },
    { value: 'admin', label: 'Admin' }
  ];

  useEffect(() => {
    // Check if user is admin
    if (!user || user.role !== 'admin') {
      console.log('User is not admin:', user);
      toast.error('Unauthorized: Admin access only');
      navigate('/');
      return;
    }

    console.log('User is admin, proceeding with fetchUsers');
    fetchUsers();
  }, [user, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Current user:', user);
      console.log('Token being used:', token);
      
      if (!token) {
        console.error('No token available');
        toast.error('Authentication token not found');
        logout();
        navigate('/login');
        return;
      }

      const response = await axios.get('http://localhost:3000/api/auth/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Users fetched successfully:', response.data);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      console.error('Error response:', error.response);
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
        logout();
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to fetch users');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      console.log('Updating role with token:', token);
      if (!token) {
        console.error('No token available');
        toast.error('Authentication token not found');
        logout();
        navigate('/login');
        return;
      }

      await axios.patch(`http://localhost:3000/api/auth/admin/users/${userId}/role`, 
        { role: newRole },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      toast.success('User role updated successfully');
      setUsers(users.map(user => 
        user._id === userId 
          ? { ...user, role: newRole } 
          : user
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
      console.error('Error response:', error.response);
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
        logout();
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to update user role');
      }
    }
  };

  const handleStatusChange = async (userId, isActive) => {
    try {
      console.log('Updating status with token:', token);
      if (!token) {
        console.error('No token available');
        toast.error('Authentication token not found');
        logout();
        navigate('/login');
        return;
      }

      await axios.patch(`http://localhost:3000/api/auth/admin/users/${userId}/status`, 
        { isActive: !isActive },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      toast.success(`User ${isActive ? 'deactivated' : 'activated'} successfully`);
      setUsers(users.map(user => 
        user._id === userId 
          ? { ...user, isActive: !isActive } 
          : user
      ));
    } catch (error) {
      console.error('Error updating user status:', error);
      console.error('Error response:', error.response);
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
        logout();
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to update user status');
      }
    }
  };

  // Filter users based on search term and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">User Management</h1>
      
      {/* Search and Filter Controls */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg shadow">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <select
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            {roles.map(role => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className={`text-sm text-gray-900 border rounded px-2 py-1 ${
                        user.role === 'admin' ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                      }`}
                      value={user.role}
                      onChange={(e) => handleRoleChange(user._id, e.target.value)}
                      disabled={user.role === 'admin'}
                    >
                      {roles.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleStatusChange(user._id, user.isActive)}
                      className={`${
                        user.role === 'admin' 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : user.isActive 
                            ? 'text-red-600 hover:text-red-900' 
                            : 'text-green-600 hover:text-green-900'
                      }`}
                      disabled={user.role === 'admin'}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 