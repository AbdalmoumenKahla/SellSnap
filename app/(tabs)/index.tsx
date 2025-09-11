import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as SQLite from 'expo-sqlite';
import React from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Types
type Customer = { id: number; name: string };
type Item = { id: number; name: string; price: number; quantity: number; image: any; pieces?: number; stock_quantity?: number };
type SalesHistory = { id: number; customer_name: string; items: string; total: number; date: string };

export default function HomeScreen() {
  // Database setup - use useMemo to create database connection only once
  const db = React.useMemo(() => SQLite.openDatabaseSync('sellsnap.db'), []);

  React.useEffect(() => {
    // Create tables
    db.execSync(
      'CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);'
    );
    db.execSync(
      'CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL, image TEXT, pieces INTEGER DEFAULT 1, stock_quantity INTEGER DEFAULT 0);'
    );
    db.execSync(
      'CREATE TABLE IF NOT EXISTS sales_history (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT, items TEXT, total REAL, date TEXT);'
    );
    db.execSync(
      'CREATE TABLE IF NOT EXISTS display_items (item_id INTEGER PRIMARY KEY, is_displayed INTEGER);'
    );
    
  }, []);

  // Load all data when component mounts
  React.useEffect(() => {
    loadCustomers();
    loadAllItems();
    loadSalesHistory();
    loadDisplayItems();
  }, []);

  // State variables
  const [currentView, setCurrentView] = React.useState<'home' | 'customer_management' | 'start_movement' | 'manage_display' | 'stock_management' | 'sales_history'>('home');
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [availableItems, setAvailableItems] = React.useState<Item[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [showItems, setShowItems] = React.useState(false);  const [customerQuantities, setCustomerQuantities] = React.useState<{[customerId: number]: {[itemId: number]: number}}>({});
  const [salesHistory, setSalesHistory] = React.useState<SalesHistory[]>([]);
  
  // Modal states
  const [addNewCustomerModalVisible, setAddNewCustomerModalVisible] = React.useState(false);
  const [newCustomerName, setNewCustomerName] = React.useState('');
  const [addItemModalVisible, setAddItemModalVisible] = React.useState(false);
  const [newItemName, setNewItemName] = React.useState('');
  const [newItemPrice, setNewItemPrice] = React.useState('');
  const [newItemPieces, setNewItemPieces] = React.useState('');
  const [newItemStockQuantity, setNewItemStockQuantity] = React.useState('');
  const [newItemImage, setNewItemImage] = React.useState<{ uri: string } | null>(null);
  
  // New states for sales workflow
  const [displayItems, setDisplayItems] = React.useState<{[itemId: number]: boolean}>({});
  const [currentSaleItems, setCurrentSaleItems] = React.useState<{[itemId: number]: number}>({});
  const [currentSaleTotal, setCurrentSaleTotal] = React.useState(0);
  
  // Create a ref to hold the current items state for stable access
  const itemsRef = React.useRef<Item[]>(items);
  
  // Update the ref whenever items change
  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  
  // States for editing items
  const [editingItem, setEditingItem] = React.useState<Item | null>(null);
  const [editModalVisible, setEditModalVisible] = React.useState(false);
  const [editName, setEditName] = React.useState('');
  const [editPrice, setEditPrice] = React.useState('');
  const [editPieces, setEditPieces] = React.useState('');
  const [editStockQuantity, setEditStockQuantity] = React.useState('');

  // Sales history filter and management states
  const [filteredSalesHistory, setFilteredSalesHistory] = React.useState<SalesHistory[]>([]);
  const [filterCustomerName, setFilterCustomerName] = React.useState('');
  const [filterYear, setFilterYear] = React.useState('');
  const [filterMonth, setFilterMonth] = React.useState('');
  const [filterDay, setFilterDay] = React.useState('');
  const [deleteFilterModalVisible, setDeleteFilterModalVisible] = React.useState(false);
  const [deleteYear, setDeleteYear] = React.useState('');
  const [deleteMonth, setDeleteMonth] = React.useState('');
  const [deleteDay, setDeleteDay] = React.useState('');
  
  // New modal states for improved UI
  const [showDeleteHistoryModal, setShowDeleteHistoryModal] = React.useState(false);
  const [deleteDateYear, setDeleteDateYear] = React.useState('');
  const [deleteDateMonth, setDeleteDateMonth] = React.useState('');
  const [deleteDateDay, setDeleteDateDay] = React.useState('');
  const [showDateFilterModal, setShowDateFilterModal] = React.useState(false);

  // Database operations
  const loadCustomers = React.useCallback(() => {
    try {
      const rows = db.getAllSync('SELECT * FROM customers;');
      setCustomers(rows as Customer[] ?? []);
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  }, [db]);

  const loadAllItems = () => {
    try {
      const rows = db.getAllSync('SELECT * FROM items;');
      const dbItems = (rows as any[]).map(row => ({
        id: row.id,
        name: row.name,
        price: row.price,
        quantity: 0,
        image: row.image, // Keep raw image data for render functions to parse
        pieces: row.pieces || 1,
        stock_quantity: row.stock_quantity || 0
      }));
      setItems(dbItems);
      setAvailableItems(dbItems);
      
      // Clear image cache when items are reloaded to ensure fresh images
      imageSourceCache.clear();
      
      return dbItems;
    } catch (error) {
      console.error('Error loading items from database:', error);
      setItems([]);
      setAvailableItems([]);
      return [];
    }
  };

  const loadSalesHistory = () => {
    try {
      const rows = db.getAllSync('SELECT * FROM sales_history ORDER BY date DESC;');
      
      // If no sales history exists, add a sample entry for testing
      if (rows.length === 0) {
        // Reload after adding sample data
        const updatedRows = db.getAllSync('SELECT * FROM sales_history ORDER BY date DESC;');
        const historyData = updatedRows as SalesHistory[] ?? [];
        setSalesHistory(historyData);
        setFilteredSalesHistory(historyData);
      } else {
        const historyData = rows as SalesHistory[] ?? [];
        // Ensure proper sorting by timestamp (newest first)
        const sortedData = historyData.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB.getTime() - dateA.getTime();
        });
        setSalesHistory(sortedData);
        setFilteredSalesHistory(sortedData);
      }
    } catch (error) {
      setSalesHistory([]);
      setFilteredSalesHistory([]);
    }
  };

  const loadDisplayItems = () => {
    try {
      const rows = db.getAllSync('SELECT * FROM display_items WHERE is_displayed = 1;');
      const displayItemsMap: {[itemId: number]: boolean} = {};
      
      rows.forEach((row: any) => {
        displayItemsMap[row.item_id] = true;
      });
      
      setDisplayItems(displayItemsMap);
    } catch (error) {
      console.error('Error loading display items:', error);
      setDisplayItems({});
    }
  };

  // Sales workflow functions - memoized to prevent re-renders
  const toggleDisplayItem = React.useCallback((itemId: number) => {
    const newDisplayState = !displayItems[itemId];
    
    // Update state
    setDisplayItems(prev => ({
      ...prev,
      [itemId]: newDisplayState
    }));
    
    // Save to database
    try {
      if (newDisplayState) {
        // Add to display (insert or update)
        db.runSync(
          'INSERT OR REPLACE INTO display_items (item_id, is_displayed) VALUES (?, 1);',
          [itemId]
        );
      } else {
        // Remove from display (delete or set to 0)
        db.runSync(
          'DELETE FROM display_items WHERE item_id = ?;',
          [itemId]
        );
      }
    } catch (error) {
      console.error('Error saving display item:', error);
      // Revert state change on error
      setDisplayItems(prev => ({
        ...prev,
        [itemId]: !newDisplayState
      }));
    }
  }, [displayItems, db]);

  const updateSaleItemQuantity = React.useCallback((itemId: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    // Update both states using functional updates to avoid race conditions
    setCurrentSaleItems(prev => {
      const currentQuantity = prev[itemId] || 0;
      
      // Calculate price using items directly from state
      const item = items.find(i => i.id === itemId);
      if (!item) return prev;
      
      const quantityDiff = newQuantity - currentQuantity;
      
      // Update the total based on the difference
      setCurrentSaleTotal(prevTotal => prevTotal + (quantityDiff * item.price));
      
      const updated = { ...prev };
      if (newQuantity === 0) {
        delete updated[itemId];
      } else {
        updated[itemId] = newQuantity;
      }
      return updated;
    });
  }, []); // Remove items dependency to make it truly stable

  // Create truly stable reference for the update function with empty deps
  const stableUpdateQuantity = React.useCallback((itemId: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    // Use setCurrentSaleItems with functional update to access current items
    setCurrentSaleItems(prev => {
      const currentQuantity = prev[itemId] || 0;
      const quantityDiff = newQuantity - currentQuantity;
      
      // Calculate price using the latest items state through a ref or direct access
      // Get fresh items data by accessing current state
      const currentItems = itemsRef.current || [];
      const currentItem = currentItems.find((i: Item) => i.id === itemId);
      if (!currentItem) {
        return prev;
      }
      
      // Update the total based on the difference
      setCurrentSaleTotal(prevTotal => prevTotal + (quantityDiff * currentItem.price));
      
      const updated = { ...prev };
      if (newQuantity === 0) {
        delete updated[itemId];
      } else {
        updated[itemId] = newQuantity;
      }
      return updated;
    });
  }, []); // Empty dependency array for true stability

  const saveSale = async () => {
    if (!selectedCustomer) {
      Alert.alert('خطأ', 'يرجى اختيار العميل');
      return;
    }

    const saleItemsCount = Object.keys(currentSaleItems).length;
    if (saleItemsCount === 0) {
      Alert.alert('خطأ', 'يرجى اختيار الأصناف المراد بيعها');
      return;
    }

    // Check stock availability
    const insufficientStock = [];
    for (const [itemIdStr, quantity] of Object.entries(currentSaleItems)) {
      const itemId = parseInt(itemIdStr);
      const item = items.find(i => i.id === itemId);
      if (item && (item.stock_quantity || 0) < quantity) {
        insufficientStock.push(`${item.name}: متوفر ${item.stock_quantity || 0} قطعة فقط`);
      }
    }

    if (insufficientStock.length > 0) {
      Alert.alert(
        'مخزون غير كافي',
        `العناصر التالية غير متوفرة بالكمية المطلوبة:\n\n${insufficientStock.join('\n')}`,
        [{ text: 'موافق', style: 'default' }]
      );
      return;
    }

    try {
      // Update stock quantities
      for (const [itemIdStr, quantity] of Object.entries(currentSaleItems)) {
        const itemId = parseInt(itemIdStr);
        const item = items.find(i => i.id === itemId);
        if (item) {
          const newStockQuantity = (item.stock_quantity || 0) - quantity;
          db.runSync('UPDATE items SET stock_quantity = ? WHERE id = ?;', [newStockQuantity, itemId]);
        }
      }

      // Create sale description
      const saleDescription = Object.entries(currentSaleItems)
        .map(([itemIdStr, quantity]) => {
          const item = items.find(i => i.id === parseInt(itemIdStr));
          return `${item?.name}: ${quantity} قطعة`;
        })
        .join(', ');

      // Save to sales history with full timestamp
      const saleDateTime = new Date().toISOString();
      db.runSync(
        'INSERT INTO sales_history (customer_name, items, total, date) VALUES (?, ?, ?, ?);',
        [selectedCustomer.name, saleDescription, currentSaleTotal, saleDateTime]
      );

      // Reset sale state
      setCurrentSaleItems({});
      setCurrentSaleTotal(0);
      setSelectedCustomer(null);
      setShowItems(false);
      
      // Reload items to reflect new stock quantities
      loadAllItems();
      
      // Reload sales history to show the new sale
      loadSalesHistory();
      
      Alert.alert('نجح', 'تم حفظ عملية البيع بنجاح');
      setCurrentView('home');
    } catch (error) {
      console.error('Error saving sale:', error);
      Alert.alert('خطأ', 'فشل في حفظ عملية البيع');
    }
  };


  // Helper functions for date generation
  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 10; i--) {
      years.push(i.toString());
    }
    return years;
  };

  const generateMonths = () => {
    return [
      { value: '01', label: '1' },
      { value: '02', label: '2' },
      { value: '03', label: '3' },
      { value: '04', label: '4' },
      { value: '05', label: '5' },
      { value: '06', label: '6' },
      { value: '07', label: '7' },
      { value: '08', label: '8' },
      { value: '09', label: '9' },
      { value: '10', label: '10' },
      { value: '11', label: '11' },
      { value: '12', label: '12' }
    ];
  };

  

  const handleDeleteYearChange = React.useCallback((value: string) => {
    setDeleteYear(value);
    // Clear month and day when year changes
    setDeleteMonth('');
    setDeleteDay('');
  }, []);

  const handleDeleteMonthChange = React.useCallback((value: string) => {
    setDeleteMonth(value);
    // Clear day when month changes
    setDeleteDay('');
  }, []);

  const handleDeleteDayChange = React.useCallback((value: string) => {
    setDeleteDay(value);
  }, []);

  const applyFilters = React.useCallback(() => {
    let filtered = [...salesHistory];

    // Filter by customer name (only using filterCustomerName, NOT historySearchText)
    if (filterCustomerName.trim()) {
      filtered = filtered.filter(item => 
        item.customer_name.toLowerCase().includes(filterCustomerName.toLowerCase())
      );
    }

    // Filter by date
    if (filterYear) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date);
        const itemYear = itemDate.getFullYear().toString();
        
        if (itemYear !== filterYear) return false;
        
        if (filterMonth) {
          const itemMonth = (itemDate.getMonth() + 1).toString().padStart(2, '0');
          if (itemMonth !== filterMonth) return false;
          
          if (filterDay) {
            const itemDay = itemDate.getDate().toString().padStart(2, '0');
            if (itemDay !== filterDay) return false;
          }
        }
        
        return true;
      });
    }

    setFilteredSalesHistory(filtered);
  }, [salesHistory, filterCustomerName, filterYear, filterMonth, filterDay]);

  const clearFilters = React.useCallback(() => {
    setFilterCustomerName('');
    setFilterYear('');
    setFilterMonth('');
    setFilterDay('');
    // Reset to original sales history sorted by date+time descending
    const sortedHistory = [...salesHistory].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime(); // Newest first
    });
    setFilteredSalesHistory(sortedHistory);
  }, [salesHistory]);

  const handleDeleteSingleHistory = React.useCallback((historyItem: SalesHistory) => {
    const formattedDate = new Date(historyItem.date).toLocaleString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    Alert.alert(
      'تأكيد الحذف',
      `هل تريد حذف عملية البيع للعميل "${historyItem.customer_name}" بتاريخ ${formattedDate}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              db.runSync('DELETE FROM sales_history WHERE id = ?;', [historyItem.id]);
              loadSalesHistory();
              Alert.alert('نجح', 'تم حذف عملية البيع بنجاح');
            } catch (error) {
              console.error('Error deleting sale history:', error);
              Alert.alert('خطأ', 'فشل في حذف عملية البيع');
            }
          }
        }
      ]
    );
  }, [db, loadSalesHistory]);

  const handleDeleteByDateFilter = React.useCallback(() => {
    if (!deleteDateYear) {
      Alert.alert('خطأ', 'يرجى إدخال السنة على الأقل');
      return;
    }

    let dateFilter = deleteDateYear;
    let displayDate = deleteDateYear;

    if (deleteDateMonth) {
      dateFilter += `-${deleteDateMonth.padStart(2, '0')}`;
      displayDate += `-${deleteDateMonth.padStart(2, '0')}`;
      
      if (deleteDateDay) {
        dateFilter += `-${deleteDateDay.padStart(2, '0')}`;
        displayDate += `-${deleteDateDay.padStart(2, '0')}`;
      }
    }

    // Count matching records first
    let countQuery = 'SELECT COUNT(*) as count FROM sales_history WHERE date LIKE ?';
    let searchPattern = deleteDateDay ? dateFilter : dateFilter + '%';
    
    const countResult = db.getAllSync(countQuery, [searchPattern]);
    const matchCount = (countResult[0] as any)?.count || 0;

    if (matchCount === 0) {
      Alert.alert('تنبيه', 'لا توجد عمليات بيع تطابق التاريخ المحدد');
      return;
    }

    Alert.alert(
      'تأكيد الحذف',
      `هل تريد حذف جميع عمليات البيع (${matchCount} عملية) للتاريخ ${displayDate}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف الكل',
          style: 'destructive',
          onPress: async () => {
            try {
              db.runSync('DELETE FROM sales_history WHERE date LIKE ?;', [searchPattern]);
              loadSalesHistory();
              setShowDeleteHistoryModal(false);
              setDeleteDateYear('');
              setDeleteDateMonth('');
              setDeleteDateDay('');
              Alert.alert('نجح', `تم حذف ${matchCount} عملية بيع بنجاح`);
            } catch (error) {
              console.error('Error deleting sales history by date:', error);
              Alert.alert('خطأ', 'فشل في حذف عمليات البيع');
            }
          }
        }
      ]
    );
  }, [deleteDateYear, deleteDateMonth, deleteDateDay]);

  // Memoized filter function to prevent re-renders
  const getFilteredHistory = React.useMemo(() => {
    let filtered = [...salesHistory];

    // Filter by customer name
    if (filterCustomerName.trim()) {
      filtered = filtered.filter(item => 
        item.customer_name.toLowerCase().includes(filterCustomerName.toLowerCase())
      );
    }

    // Apply date filters
    if (filterYear) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date);
        const itemYear = itemDate.getFullYear().toString();
        
        if (itemYear !== filterYear) return false;
        
        if (filterMonth) {
          const itemMonth = (itemDate.getMonth() + 1).toString().padStart(2, '0');
          if (itemMonth !== filterMonth) return false;
          
          if (filterDay) {
            const itemDay = itemDate.getDate().toString().padStart(2, '0');
            if (itemDay !== filterDay) return false;
          }
        }
        
        return true;
      });
    }

    // Ensure filtered results are sorted by date+time in descending order (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
    });

    return filtered;
  }, [salesHistory, filterCustomerName, filterYear, filterMonth, filterDay]);

  // Item editing functions
  const handleEditItem = React.useCallback((item: Item) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditPrice(item.price.toString());
    setEditPieces(item.pieces?.toString() || '1');
    setEditStockQuantity(item.stock_quantity?.toString() || '0');
    setEditModalVisible(true);
  }, []);

  const handleUpdateItem = React.useCallback(async () => {
    if (!editingItem || !editName.trim() || !editPrice.trim()) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const pieces = parseInt(editPieces) || 1;
      const stockQuantity = parseInt(editStockQuantity) || 0;
      
      db.runSync(
        'UPDATE items SET name = ?, price = ?, pieces = ?, stock_quantity = ? WHERE id = ?;',
        [
          editName.trim(),
          parseFloat(editPrice),
          pieces,
          stockQuantity,
          editingItem.id
        ]
      );
      
      setEditModalVisible(false);
      setEditingItem(null);
      setEditName('');
      setEditPrice('');
      setEditPieces('');
      setEditStockQuantity('');
      
      loadAllItems();
      
      Alert.alert('نجح', 'تم تحديث الصنف بنجاح');
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert('خطأ', 'فشل في تحديث الصنف');
    }
  }, [editingItem, editName, editPrice, editPieces, editStockQuantity]);

  const handleDeleteItem = React.useCallback((item: Item) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل تريد حذف الصنف "${item.name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              db.runSync('DELETE FROM items WHERE id = ?;', [item.id]);
              // Also remove from display items
              db.runSync('DELETE FROM display_items WHERE item_id = ?;', [item.id]);
              loadAllItems();
              loadDisplayItems(); // Reload display items as well
              Alert.alert('نجح', 'تم حذف الصنف بنجاح');
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('خطأ', 'فشل في حذف الصنف');
            }
          }
        }
      ]
    );
  }, []);

  // Delete customer - memoized to prevent re-renders
  const handleDeleteCustomer = React.useCallback((customer: Customer) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل تريد حذف العميل "${customer.name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              db.runSync('DELETE FROM customers WHERE id = ?;', [customer.id]);
              loadCustomers();
              Alert.alert('نجح', 'تم حذف العميل بنجاح');
            } catch (error) {
              console.error('Error deleting customer:', error);
              Alert.alert('خطأ', 'فشل في حذف العميل');
            }
          }
        }
      ]
    );
  }, [db, loadCustomers]);

  // Add new item
  const handleAddNewItem = React.useCallback(async () => {
    if (newItemName.trim() && newItemPrice.trim()) {
      try {
        const imageUri = newItemImage ? JSON.stringify(newItemImage) : null;
        
        const pieces = parseInt(newItemPieces) || 1;
        const stockQuantity = parseInt(newItemStockQuantity) || 0;
        
        db.runSync(
          'INSERT INTO items (name, price, image, pieces, stock_quantity) VALUES (?, ?, ?, ?, ?);',
          [newItemName.trim(), parseFloat(newItemPrice), imageUri, pieces, stockQuantity]
        );
        
        setNewItemName('');
        setNewItemPrice('');
        setNewItemPieces('');
        setNewItemStockQuantity('');
        setNewItemImage(null);
        setAddItemModalVisible(false);
        
        loadAllItems();
        
        Alert.alert('نجح', 'تم إضافة الصنف بنجاح');
      } catch (error) {
        console.error('Error adding item:', error);
        Alert.alert('خطأ', 'فشل في إضافة الصنف');
      }
    } else {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
    }
  }, [newItemName, newItemPrice, newItemPieces, newItemStockQuantity, newItemImage]);


  

  // Memoized modal cancel handlers to prevent re-renders
  const handleCancelAddItem = React.useCallback(() => {
    setAddItemModalVisible(false);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemPieces('');
    setNewItemStockQuantity('');
    setNewItemImage(null);
  }, []);

  const handleCancelEditItem = React.useCallback(() => {
    setEditModalVisible(false);
    setEditingItem(null);
    setEditName('');
    setEditPrice('');
    setEditPieces('');
    setEditStockQuantity('');
  }, []);

  const handleCancelAddCustomer = React.useCallback(() => {
    setAddNewCustomerModalVisible(false);
    setNewCustomerName('');
  }, []);

  // Pick image
  const pickImageForNewItem = React.useCallback(async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'نحتاج إلى إذن للوصول إلى الصور');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Validate the URI before setting
        if (imageUri && (imageUri.startsWith('file://') || imageUri.startsWith('content://') || imageUri.startsWith('http'))) {
          setNewItemImage({ uri: imageUri });
        } else {
          Alert.alert('خطأ', 'صيغة الصورة غير صحيحة');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء اختيار الصورة');
    }
  }, []);

  // Global customer management function
  const handleAddCustomer = React.useCallback(async () => {
    if (!newCustomerName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم العميل');
      return;
    }

    try {
      await db.runAsync('INSERT INTO customers (name) VALUES (?)', [newCustomerName.trim()]);
      
      setNewCustomerName('');
      setAddNewCustomerModalVisible(false);
      
      await loadCustomers();
      
      Alert.alert('نجح', 'تم إضافة العميل بنجاح');
    } catch (error) {
      console.error('Error adding customer:', error);
      Alert.alert('خطأ', 'فشل في إضافة العميل');
    }
  }, [newCustomerName]);

  // Render functions - memoized to prevent re-creation
  const renderCustomerItem = React.useCallback(({ item }: { item: Customer }) => (
    <View style={styles.customerItem}>
      <TouchableOpacity
        style={styles.customerContent}
        onPress={() => {
          setSelectedCustomer(item);
          if (currentView === 'start_movement') {
            // In sales mode, show items for sale
            loadAllItems();
            setShowItems(true);
          } else {
            // In old mode, show all items (keep for backward compatibility)
            loadAllItems();
            setShowItems(true);
          }
        }}
      >
        <Text style={styles.customerName}>{item.name}</Text>
        <Text style={styles.customerID}>العميل رقم: {item.id}</Text>
      </TouchableOpacity>
    </View>
  ), [currentView]);


  const renderHistoryItem = ({ item }: { item: SalesHistory }) => {
    // Parse items to display them properly
    let itemsList = [];
    try {
      if (item.items.includes(',')) {
        // Handle comma-separated format: "Item Name: X قطعة, Item Name2: Y قطعة"
        const parts = item.items.split(', ');
        itemsList = parts.map(part => {
          // Match format "Item Name: X قطعة"
          const match = part.match(/(.+?):\s*(\d+)\s*قطعة/);
          if (match) {
            return { name: match[1].trim(), quantity: parseInt(match[2]) };
          }
          // Fallback for old format "Item Name x X"
          const oldMatch = part.match(/(.+?) x (\d+)/);
          if (oldMatch) {
            return { name: oldMatch[1], quantity: parseInt(oldMatch[2]) };
          }
          return { name: part, quantity: 1 };
        });
      } else {
        // Handle single item format: "Item Name: X قطعة"
        const match = item.items.match(/(.+?):\s*(\d+)\s*قطعة/);
        if (match) {
          itemsList = [{ name: match[1].trim(), quantity: parseInt(match[2]) }];
        } else {
          // Fallback for old format "Item Name x X"
          const oldMatch = item.items.match(/(.+?) x (\d+)/);
          if (oldMatch) {
            itemsList = [{ name: oldMatch[1], quantity: parseInt(oldMatch[2]) }];
          } else {
            itemsList = [{ name: item.items, quantity: 1 }];
          }
        }
      }
    } catch (error) {
      itemsList = [{ name: item.items, quantity: 1 }];
    }

    return (
      <View style={styles.historyItem}>
        <View style={styles.historyItemHeader}>
          <Text style={styles.historyDate}>
            {new Date(item.date).toLocaleString('ar-EG', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </Text>
          <Text style={styles.historyCustomer}>{item.customer_name}</Text>
          <TouchableOpacity
            style={styles.historyDeleteButton}
            onPress={() => handleDeleteSingleHistory(item)}
          >
            <Text style={styles.historyDeleteText}>🗑️</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.historyItemsContainer}>
          {itemsList.map((historyItem, index) => {
            // Find the current item to get its price
            const currentItem = items.find(item => item.name === historyItem.name);
            const itemPrice = currentItem ? currentItem.price : 0;
            const totalPrice = itemPrice * historyItem.quantity;
            
            return (
              <Text key={index} style={styles.historyItemText}>
                {historyItem.name}[{itemPrice.toFixed(2)}] x {historyItem.quantity} = {totalPrice.toFixed(2)} شيكل
              </Text>
            );
          })}
        </View>
        
        <View style={styles.historyTotalContainer}>
          <Text style={styles.historyTotal}>المجموع: {item.total} شيكل</Text>
        </View>
      </View>
    );
  };

  // Placeholder views for the new screens
  const CustomerManagementView = React.memo(() => {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>إدارة العملاء</Text>
        <FlatList
          data={customers}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.customerItem}>
              <TouchableOpacity
                style={styles.customerDeleteButton}
                onPress={() => handleDeleteCustomer(item)}
              >
                <Text style={styles.customerDeleteText}>🗑️</Text>
              </TouchableOpacity>
              <View style={styles.customerContent}>
                <Text style={styles.customerName}>{item.name}</Text>
                <Text style={styles.customerID}>العميل رقم: {item.id}</Text>
              </View>
            </View>
          )}
          contentContainerStyle={scrollViewStyle}
          ListEmptyComponent={
            <Text style={styles.emptyText}>لا يوجد عملاء مسجلين</Text>
          }
        />
        
        <TouchableOpacity 
          style={[styles.mainButton, styles.modernAddButton]} 
          onPress={() => setAddNewCustomerModalVisible(true)}
        >
          <View style={styles.buttonContentContainer}>
            <Text style={styles.buttonIcon}>👤</Text>
            <Text style={styles.modernButtonText}>إضافة عميل جديد</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => setCurrentView('home')}
        >
          <Text style={styles.buttonIcon}>🏠</Text>
          <Text style={styles.backButtonText}>العودة للرئيسية</Text>
        </TouchableOpacity>
      </View>
    );
  });

  // Enhanced SaleItemCard component with better optimization
  const SaleItemCard = React.memo(({ item, imageSource, currentQuantity, onUpdateQuantity }: {
    item: Item;
    imageSource: any;
    currentQuantity: number;
    onUpdateQuantity: (itemId: number, newQuantity: number) => void;
  }) => {
     
    const handleDecrement = React.useCallback(() => {
      if (currentQuantity > 0) {
        onUpdateQuantity(item.id, currentQuantity - 1);
      }
    }, [item.id, currentQuantity, onUpdateQuantity]);

    const handleIncrement = React.useCallback(() => {
      if (currentQuantity < (item.stock_quantity || 0)) {
        onUpdateQuantity(item.id, currentQuantity + 1);
      } else {
        Alert.alert('تحذير', `الحد الأقصى المتوفر: ${item.stock_quantity || 0} قطعة`);
      }
    }, [item.id, item.stock_quantity, currentQuantity, onUpdateQuantity]);

    return (
      <View style={styles.saleItemCard}>
        <Image 
          source={imageSource} 
          style={styles.saleItemImage}
          fadeDuration={0}
          resizeMode="contain"
        />
        <View style={styles.saleItemDetails}>
          <Text style={styles.saleItemName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.saleItemPrice}>{item.price} شيكل</Text>
          <Text style={styles.saleItemPieces}>{item.pieces || 1} قطعة</Text>
        </View>
        
        <View style={styles.saleQuantityContainer}>
          <TouchableOpacity 
            style={styles.saleQuantityButton}
            onPress={handleDecrement}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.saleQuantityButtonText} pointerEvents="none">-</Text>
          </TouchableOpacity>
          
          <Text style={styles.saleQuantityText}>{currentQuantity}</Text>
          
          <TouchableOpacity 
            style={styles.saleQuantityButton}
            onPress={handleIncrement}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.saleQuantityButtonText} pointerEvents="none">+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, (prevProps, nextProps) => {
    // More thorough image source comparison
    const prevImage = prevProps.imageSource;
    const nextImage = nextProps.imageSource;
    
    const imageSourceEqual = 
      prevImage === nextImage ||
      (prevImage?.uri === nextImage?.uri && 
       prevImage?.testUri === nextImage?.testUri);
    
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.name === nextProps.item.name &&
      prevProps.item.price === nextProps.item.price &&
      prevProps.item.pieces === nextProps.item.pieces &&
      prevProps.item.stock_quantity === nextProps.item.stock_quantity &&
      prevProps.currentQuantity === nextProps.currentQuantity &&
      imageSourceEqual &&
      prevProps.onUpdateQuantity === nextProps.onUpdateQuantity
    );
  });

  // Enhanced image source cache with better management
  const imageSourceCache = React.useMemo(() => new Map<string, any>(), []);
  
  // Memoized function to parse and cache image source with better key management
  const parseImageSource = React.useCallback((itemId: number, imageData: any) => {
    // Create a stable cache key
    const cacheKey = `${itemId}_${typeof imageData === 'string' ? imageData.slice(0, 50) : JSON.stringify(imageData).slice(0, 50)}`;
    
    // Check if we already have this image cached
    if (imageSourceCache.has(cacheKey)) {
      return imageSourceCache.get(cacheKey);
    }

    // Parse the image source
    let imageSource = require('../../assets/images/sellsnap_icon.png');
    if (imageData) {
      try {
        if (typeof imageData === 'object' && imageData.uri) {
          imageSource = { uri: imageData.uri };
        } else if (typeof imageData === 'string' && imageData.startsWith('{')) {
          const parsedImage = JSON.parse(imageData);
          if (parsedImage && parsedImage.uri) {
            imageSource = { uri: parsedImage.uri };
          }
        } else if (typeof imageData === 'string' && (imageData.startsWith('file://') || imageData.startsWith('http'))) {
          imageSource = { uri: imageData };
        }
      } catch (error) {
        console.log('Using default image for item with ID:', itemId);
      }
    }

    // Cache the parsed image source
    imageSourceCache.set(cacheKey, imageSource);
    return imageSource;
  }, [imageSourceCache]);

  // Memoized image sources map to prevent re-parsing on every render
  const memoizedImageSources = React.useMemo(() => {
    const imageMap = new Map();
    items.forEach(item => {
      imageMap.set(item.id, parseImageSource(item.id, item.image));
    });
    return imageMap;
  }, [items, parseImageSource]);

  const StartMovementView = React.memo(() => {
    if (showItems && selectedCustomer) {
      // Show sales interface with selected items
      const availableItemsForSale = items.filter(item => displayItems[item.id]);
      
      return (
        <View style={styles.container}>
          <Text style={styles.header}>العميل: {selectedCustomer.name}</Text>
          <Text style={styles.subHeader}>اختر الأصناف والكمية المطلوبة</Text>
          
          <FlatList
            data={availableItemsForSale}
            numColumns={3}
            keyExtractor={item => `sale-item-${item.id}`}
            extraData={Object.keys(currentSaleItems).length} // Only re-render when items are added/removed
            removeClippedSubviews={true}
            maxToRenderPerBatch={9}
            windowSize={10}
            getItemLayout={(data, index) => (
              {length: 120, offset: 120 * Math.floor(index / 3), index}
            )}
            renderItem={({ item }) => {
              const imageSource = memoizedImageSources.get(item.id);
              const currentQuantity = currentSaleItems[item.id] || 0;

              return (
                <SaleItemCard
                  item={item}
                  imageSource={imageSource}
                  currentQuantity={currentQuantity}
                  onUpdateQuantity={stableUpdateQuantity}
                />
              );
            }}
            columnWrapperStyle={styles.saleItemRow}
            contentContainerStyle={styles.saleGrid}
            ListEmptyComponent={
              <Text style={styles.emptyText}>لا توجد أصناف متاحة للعرض. يرجى تحديد الأصناف من إدارة عرض الأصناف أولاً.</Text>
            }
          />
          
          <View style={styles.totalContainer}>
            <Text style={styles.totalText}>المجموع: {currentSaleTotal.toFixed(2)} شيكل</Text>
            
            <View style={styles.saleActionsContainer}>
              <TouchableOpacity style={styles.saveButton} onPress={saveSale}>
                <Text style={styles.buttonText}>حفظ عملية البيع</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => {
                  setShowItems(false);
                  setSelectedCustomer(null);
                  setCurrentSaleItems({});
                  setCurrentSaleTotal(0);
                }}
              >
                <Text style={styles.buttonText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    // Show customer selection
    return (
      <View style={styles.container}>
        <Text style={styles.header}>اختر العميل</Text>
        
        <FlatList
          data={customers}
          keyExtractor={item => item.id.toString()}
          renderItem={renderCustomerItem}
          contentContainerStyle={scrollViewStyle}
          ListEmptyComponent={
            <View style={styles.container}>
              <Text style={styles.emptyText}>لا توجد عملاء</Text>
              <Text style={styles.emptyText}>يرجى إضافة عملاء من قسم إدارة العملاء أولاً</Text>
              <TouchableOpacity 
                style={[styles.backButton, styles.modernAddButton]} 
                onPress={() => setCurrentView('customer_management')}
              >
                <Text style={styles.buttonText}>انتقل لإدارة العملاء</Text>
              </TouchableOpacity>
            </View>
          }
        />
        
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => setCurrentView('home')}
        >
          <Text style={styles.buttonIcon}>🏠</Text>
          <Text style={styles.backButtonText}>العودة للرئيسية</Text>
        </TouchableOpacity>
      </View>
    );
  });

  // Memoized display item component to prevent image re-rendering
  const DisplayItemCard = React.memo(({ item, isSelected, onToggle, imageSource }: {
    item: Item;
    isSelected: boolean;
    onToggle: () => void;
    imageSource: any;
  }) => {

    return (
      <TouchableOpacity
        style={[
          styles.displayItemCard,
          isSelected && styles.selectedDisplayItem
        ]}
        onPress={onToggle}
      >
        <Image 
          source={imageSource} 
          style={styles.displayItemImage} 
          fadeDuration={0}
          resizeMode="contain"
        />
        <View style={styles.displayItemDetails}>
          <Text style={styles.displayItemName}>{item.name}</Text>
          <Text style={styles.displayItemPrice}>{item.price} شيكل</Text>
          <Text style={styles.displayItemPieces}>{item.pieces || 1} قطعة</Text>
        </View>
        
        {isSelected && (
          <View style={styles.selectionIndicator}>
            <Text style={styles.selectionIcon}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, (prevProps, nextProps) => {
    // More thorough image source comparison
    const prevImage = prevProps.imageSource;
    const nextImage = nextProps.imageSource;
    
    const imageSourceEqual = 
      prevImage === nextImage ||
      (prevImage?.uri === nextImage?.uri);
    
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.name === nextProps.item.name &&
      prevProps.item.price === nextProps.item.price &&
      prevProps.item.pieces === nextProps.item.pieces &&
      prevProps.isSelected === nextProps.isSelected &&
      imageSourceEqual
    );
  });

  const ManageDisplayView = React.memo(() => {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>ادارة عرض الاصناف</Text>
        <Text style={styles.subHeader}>اختر الأصناف التي تريد عرضها للعملاء</Text>
      
      <FlatList
        data={items}
        numColumns={2}
        keyExtractor={item => item.id.toString()}
        extraData={`${Object.keys(displayItems).length}`} // Convert to string for stability
        renderItem={({ item }) => {
          const imageSource = memoizedImageSources.get(item.id);
          const isSelected = displayItems[item.id] || false;
          
          return (
            <DisplayItemCard
              item={item}
              isSelected={isSelected}
              onToggle={() => toggleDisplayItem(item.id)}
              imageSource={imageSource}
            />
          );
        }}
        contentContainerStyle={styles.displayGrid}
        columnWrapperStyle={styles.displayRow}
        ListEmptyComponent={
          <Text style={styles.emptyText}>لا توجد أصناف متوفرة</Text>
        }
      />
      
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => setCurrentView('home')}
      >
        <Text style={styles.buttonIcon}>🏠</Text>
        <Text style={styles.backButtonText}>العودة للرئيسية</Text>
      </TouchableOpacity>
    </View>
    );
  });

  // Memoized stock item component to prevent image re-rendering
  const StockItemCard = React.memo(({ item, imageSource, onEdit, onDelete }: {
    item: Item;
    imageSource: any;
    onEdit: () => void;
    onDelete: () => void;
  }) => {
    
    return (
      <View style={styles.stockCard}>
        <Image 
          source={imageSource} 
          style={styles.stockItemImage} 
          fadeDuration={0}
          resizeMode="contain"
        />
        <View style={styles.stockItemInfo}>
          <Text style={styles.stockCardName}>{item.name}</Text>
          <Text style={styles.stockItemPrice}>السعر: {item.price} شيكل</Text>
          <Text style={styles.stockItemPieces}>القطع: {item.pieces || 1}</Text>
          <Text style={styles.stockItemQuantity}>المخزون: {item.stock_quantity || 0}</Text>
        </View>
        
        <View style={styles.stockItemActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]}
            onPress={onEdit}
          >
            <Text style={styles.actionButtonText}>✏️</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={onDelete}
          >
            <Text style={styles.actionButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, (prevProps, nextProps) => {
    // More thorough image source comparison
    const prevImage = prevProps.imageSource;
    const nextImage = nextProps.imageSource;
    
    const imageSourceEqual = 
      prevImage === nextImage ||
      (prevImage?.uri === nextImage?.uri);
    
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.name === nextProps.item.name &&
      prevProps.item.price === nextProps.item.price &&
      prevProps.item.pieces === nextProps.item.pieces &&
      prevProps.item.stock_quantity === nextProps.item.stock_quantity &&
      imageSourceEqual
    );
  });

  // Memoized render function for stock items
  const renderStockItem = React.useCallback(({ item }: { item: Item }) => {
    const imageSource = memoizedImageSources.get(item.id);

    return (
      <StockItemCard
        item={item}
        imageSource={imageSource}
        onEdit={() => handleEditItem(item)}
        onDelete={() => handleDeleteItem(item)}
      />
    );
  }, [handleEditItem, handleDeleteItem, memoizedImageSources]);

  const StockManagementView = React.memo(() => {
   
    
    const handleAddItem = React.useCallback(() => {
  
      setAddItemModalVisible(true);
    }, []);

    return (
      <View style={styles.container}>
        <Text style={styles.header}>إدارة المخزون</Text>
        
        <FlatList
          data={items}
          numColumns={2}
          keyExtractor={item => item.id.toString()}
          extraData={`${items.length}`} // Use string for stability
          renderItem={renderStockItem}
          contentContainerStyle={styles.stockGrid}
          columnWrapperStyle={styles.stockRow}
          ListEmptyComponent={
            <Text style={styles.emptyText}>لا توجد أصناف في المخزون</Text>
          }
        />
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddItem}
        >
           <Text style={styles.buttonIcon}>➕</Text>
           <Text style={styles.buttonText}> إضافة صنف جديد</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => setCurrentView('home')}
        >
          <Text style={styles.buttonIcon}>🏠</Text>
          <Text style={styles.backButtonText}>العودة للرئيسية</Text>
        </TouchableOpacity>
      </View>
    );
  });

  // Stable style objects to prevent re-renders
  const scrollViewStyle = React.useMemo(() => ({ paddingBottom: 20 }), []);
  const cancelButtonStyle = React.useMemo(() => [styles.mainButton, { backgroundColor: '#aaa' }], []);
  
  // Stable callback for modal opening
  const openDateFilterModal = React.useCallback(() => setShowDateFilterModal(true), []);
  const openDeleteHistoryModal = React.useCallback(() => setShowDeleteHistoryModal(true), []);
  const goToHomeView = React.useCallback(() => setCurrentView('home'), []);

  const SalesHistoryView = React.memo(() => {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>تاريخ المبيعات</Text>
        
        {/* Filter Controls */}
        <View style={styles.historyFiltersContainer}>
          <View style={styles.historyFilterButtons}>
            <TouchableOpacity 
              style={styles.dangerButton}
              onPress={openDeleteHistoryModal}
            >
              <Text style={styles.filterButtonText}>�️ حذف بالتاريخ</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.clearAllFiltersButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearFiltersButtonText}>� الغاء الفلاتر</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.dateFilterButton}
              onPress={openDateFilterModal}
            >
              <Text style={styles.filterButtonText}>� فلتر التاريخ</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <FlatList
          data={getFilteredHistory}
          keyExtractor={item => item.id.toString()}
          renderItem={renderHistoryItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={scrollViewStyle}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {salesHistory.length === 0 ? 'لا يوجد تاريخ مبيعات' : 'لا توجد نتائج تطابق الفلتر'}
            </Text>
          }
        />
        
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={goToHomeView}
        >
          <Text style={styles.buttonIcon}>🏠</Text>
          <Text style={styles.backButtonText}>العودة للرئيسية</Text>
        </TouchableOpacity>
      </View>
    );
  });

  // Main render based on current view
  const getCurrentViewComponent = () => {
    if (currentView === 'customer_management') return <CustomerManagementView />;
    if (currentView === 'start_movement') return <StartMovementView />;
    if (currentView === 'manage_display') return <ManageDisplayView />;
    if (currentView === 'stock_management') return <StockManagementView />;
    if (currentView === 'sales_history') return <SalesHistoryView />;
    
    // Main Home Screen with 4 buttons
    return (
      <View style={styles.container}>
        <View style={styles.mainPageContent}>
          <Text style={[styles.header, styles.mainPageTitle]}>SellSnap</Text>
          <Text style={styles.mainPageSubtitle}>نظام إدارة المبيعات المتطور</Text>
          
          <View style={styles.mainButtonsContainer}>
            {/* Button 1: بدء الحركة */}
            <TouchableOpacity 
              style={[styles.mainButton, styles.secondaryButton]} 
              onPress={() => setCurrentView('start_movement')}
            >
              <View style={styles.buttonContentContainer}>
                <Text style={styles.buttonIcon}>🏪</Text>
                <Text style={styles.buttonTextWithIcon}>بدء الحركة</Text>
              </View>
            </TouchableOpacity>
            

            {/* Button 2: إدارة العملاء */}
            <TouchableOpacity 
              style={[styles.mainButton, styles.primaryButton]} 
              onPress={() => setCurrentView('customer_management')}
            >
              <View style={styles.buttonContentContainer}>
                <Text style={styles.buttonIcon}>👥</Text>
                <Text style={styles.buttonTextWithIcon}>إدارة العملاء</Text>
              </View>
            </TouchableOpacity>
            
            
            {/* Button 3: ادارة عرض الاصناف */}
            <TouchableOpacity 
              style={[styles.mainButton, styles.tertiaryButton]} 
              onPress={() => setCurrentView('manage_display')}
            >
              <View style={styles.buttonContentContainer}>
                <Text style= {styles.buttonIcon}>🛍️</Text>
                <Text style={styles.buttonTextWithIcon}>ادارة عرض الاصناف</Text>
              </View>
            </TouchableOpacity>
            
            {/* Button 4: إدارة المخزون */}
            <TouchableOpacity 
              style={[styles.mainButton, styles.quaternaryButton]} 
              onPress={() => setCurrentView('stock_management')}
            >
              <View style={styles.buttonContentContainer}>
                <Text style={styles.buttonIcon}>📦</Text>
                <Text style={styles.buttonTextWithIcon}>إدارة المخزون</Text>
              </View>
            </TouchableOpacity>

            {/* Button 5: تاريخ المبيعات */}
            <TouchableOpacity 
              style={[styles.mainButton, styles.primaryButton]} 
              onPress={() => {
                loadSalesHistory();
                setCurrentView('sales_history');
              }}
            >
              <View style={styles.buttonContentContainer}>
                <Text style={styles.buttonIcon}>📊</Text>
                <Text style={styles.buttonTextWithIcon}>تاريخ المبيعات</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {getCurrentViewComponent()}
      
      {/* Global Modals - Always present */}
      {/* Add New Item Modal */}
      <Modal visible={addItemModalVisible} transparent animationType="fade">
        <View style={styles.addItemModalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>إضافة صنف جديد</Text>
            
            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImageForNewItem}>
              {newItemImage && newItemImage.uri ? (
                <Image 
                  source={{ uri: newItemImage.uri }} 
                  style={styles.previewImage}
                  onError={(error) => {
                    setNewItemImage(null);
                    Alert.alert('خطأ', 'فشل في عرض الصورة');
                  }}
                  onLoad={() => {
                  
                  }}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>📷</Text>
                  <Text style={styles.imagePlaceholderLabel}>اضغط لإضافة صورة</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="اسم الصنف"
              placeholderTextColor="#999"
              value={newItemName}
              onChangeText={setNewItemName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="السعر"
              placeholderTextColor="#999"
              value={newItemPrice}
              onChangeText={setNewItemPrice}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="عدد القطع (اختياري)"
              placeholderTextColor="#999"
              value={newItemPieces}
              onChangeText={setNewItemPieces}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="كمية المخزون"
              placeholderTextColor="#999"
              value={newItemStockQuantity}
              onChangeText={setNewItemStockQuantity}
              keyboardType="numeric"
            />

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity style={styles.modalAddButton} onPress={handleAddNewItem}>
                <Text style={styles.modalButtonText}>إضافة الصنف</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={handleCancelAddItem}
              >
                <Text style={styles.modalButtonText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add New Customer Modal */}
      <Modal visible={addNewCustomerModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>إضافة عميل جديد</Text>
            <TextInput
              style={styles.input}
              placeholder="اسم العميل"
              placeholderTextColor="#999"
              value={newCustomerName}
              onChangeText={setNewCustomerName}
            />
            
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity style={styles.modalAddButton} onPress={handleAddCustomer}>
                <Text style={styles.modalButtonText}>إضافة العميل</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={handleCancelAddCustomer}
              >
                <Text style={styles.modalButtonText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.addItemModalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>تعديل الصنف</Text>
            
            <TextInput
              style={styles.input}
              placeholder="اسم الصنف"
              placeholderTextColor="#999"
              value={editName}
              onChangeText={setEditName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="السعر"
              placeholderTextColor="#999"
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="عدد القطع"
              placeholderTextColor="#999"
              value={editPieces}
              onChangeText={setEditPieces}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="كمية المخزون"
              placeholderTextColor="#999"
              value={editStockQuantity}
              onChangeText={setEditStockQuantity}
              keyboardType="numeric"
            />

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity style={styles.modalAddButton} onPress={handleUpdateItem}>
                <Text style={styles.modalButtonText}>حفظ التغييرات</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={handleCancelEditItem}
              >
                <Text style={styles.modalButtonText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
     
      {/* Delete By Date Filter Modal */}
      <Modal visible={deleteFilterModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>حذف عمليات البيع بالتاريخ</Text>
            
            <Text style={styles.modalSubHeader}>
              اختر التاريخ المراد حذف جميع عمليات البيع فيه:
            </Text>
            
            {/* Date Spinners */}
            <View style={styles.dateSpinnerRow}>
              <View style={styles.dateSpinnerContainer}>
                <Text style={styles.dateSpinnerLabel}>السنة</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={deleteYear}
                    onValueChange={handleDeleteYearChange}
                    style={styles.pickerStyle}
                    mode="dropdown"
                  >
                    <Picker.Item label="اختر السنة" value="" />
                    <Picker.Item label="2024" value="2024" />
                    <Picker.Item label="2025" value="2025" />
                    <Picker.Item label="2026" value="2026" />
                  </Picker>
                </View>
              </View>
              
              <View style={styles.dateSpinnerContainer}>
                <Text style={styles.dateSpinnerLabel}>الشهر</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={deleteMonth}
                    onValueChange={handleDeleteMonthChange}
                    style={styles.pickerStyle}
                    mode="dropdown"
                    enabled={!!deleteYear}
                  >
                    <Picker.Item label="اختر الشهر" value="" />
                    <Picker.Item label="1" value="01" />
                    <Picker.Item label="2" value="02" />
                    <Picker.Item label="3" value="03" />
                    <Picker.Item label="4" value="04" />
                    <Picker.Item label="5" value="05" />
                    <Picker.Item label="6" value="06" />
                    <Picker.Item label="7" value="07" />
                    <Picker.Item label="8" value="08" />
                    <Picker.Item label="9" value="09" />
                    <Picker.Item label="10" value="10" />
                    <Picker.Item label="11" value="11" />
                    <Picker.Item label="12" value="12" />
                  </Picker>
                </View>
              </View>
              
              <View style={styles.dateSpinnerContainer}>
                <Text style={styles.dateSpinnerLabel}>اليوم</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={deleteDay}
                    onValueChange={handleDeleteDayChange}
                    style={styles.pickerStyle}
                    mode="dropdown"
                    enabled={!!deleteMonth}
                  >
                    <Picker.Item label="اختر اليوم" value="" />
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <Picker.Item 
                        key={day} 
                        label={day.toString().padStart(2, '0')} 
                        value={day.toString().padStart(2, '0')} 
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
            
            <Text style={styles.warningText}>
              ⚠️ تحذير: سيتم حذف جميع عمليات البيع التي تطابق التاريخ المحدد نهائياً
            </Text>

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={[styles.modalAddButton, styles.dangerButton]} 
                onPress={handleDeleteByDateFilter}
              >
                <Text style={styles.modalButtonText}>حذف العمليات</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => {
                  setDeleteFilterModalVisible(false);
                  setDeleteYear('');
                  setDeleteMonth('');
                  setDeleteDay('');
                }}
              >
                <Text style={styles.modalButtonText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* New Delete History Modal */}
      <Modal visible={showDeleteHistoryModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>حذف سجلات المبيعات بالتاريخ</Text>
            
            <TextInput
              style={styles.input}
              placeholder="السنة (مطلوب) - مثال: 2024"
              value={deleteDateYear}
              onChangeText={setDeleteDateYear}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            
            <TextInput
              style={styles.input}
              placeholder="الشهر (اختياري) - مثال: 09"
              value={deleteDateMonth}
              onChangeText={setDeleteDateMonth}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            
            <TextInput
              style={styles.input}
              placeholder="اليوم (اختياري) - مثال: 15"
              value={deleteDateDay}
              onChangeText={setDeleteDateDay}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />

            <Text style={styles.warningText}>
              ⚠️ تحذير: سيتم حذف جميع عمليات البيع التي تطابق التاريخ المحدد نهائياً
            </Text>

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={[styles.modalAddButton, styles.dangerButton]} 
                onPress={handleDeleteByDateFilter}
              >
                <Text style={styles.modalButtonText}>حذف العمليات</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => {
                  setShowDeleteHistoryModal(false);
                  setDeleteDateYear('');
                  setDeleteDateMonth('');
                  setDeleteDateDay('');
                }}
              >
                <Text style={styles.modalButtonText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Filter Modal */}
      <Modal visible={showDateFilterModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.dateFilterModalContent}>
            <Text style={styles.modalHeader}>فلتر بالتاريخ</Text>
            
            <View style={styles.datePickerContainer}>
              {/* Year Picker */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>السنة</Text>
                <ScrollView 
                  style={styles.datePickerScroll}
                  contentContainerStyle={styles.datePickerScrollContent}
                  showsVerticalScrollIndicator={true}
                >
                  <TouchableOpacity 
                    style={[styles.datePickerItem, !filterYear && styles.datePickerItemSelected]}
                    onPress={() => setFilterYear('')}
                  >
                    <Text style={[styles.datePickerItemText, !filterYear && styles.datePickerItemTextSelected]}>
                      الكل
                    </Text>
                  </TouchableOpacity>
                  {generateYears().map((year) => (
                    <TouchableOpacity 
                      key={year}
                      style={[styles.datePickerItem, filterYear === year && styles.datePickerItemSelected]}
                      onPress={() => setFilterYear(year)}
                    >
                      <Text style={[styles.datePickerItemText, filterYear === year && styles.datePickerItemTextSelected]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Month Picker */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>الشهر</Text>
                <ScrollView 
                  style={styles.datePickerScroll}
                  contentContainerStyle={styles.datePickerScrollContent}
                  showsVerticalScrollIndicator={true}
                >
                  <TouchableOpacity 
                    style={[styles.datePickerItem, !filterMonth && styles.datePickerItemSelected]}
                    onPress={() => setFilterMonth('')}
                  >
                    <Text style={[styles.datePickerItemText, !filterMonth && styles.datePickerItemTextSelected]}>
                      الكل
                    </Text>
                  </TouchableOpacity>
                  {generateMonths().map((month) => (
                    <TouchableOpacity 
                      key={month.value}
                      style={[styles.datePickerItem, filterMonth === month.value && styles.datePickerItemSelected]}
                      onPress={() => setFilterMonth(month.value)}
                    >
                      <Text style={[styles.datePickerItemText, filterMonth === month.value && styles.datePickerItemTextSelected]}>
                        {month.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Day Picker */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>اليوم</Text>
                <ScrollView 
                  style={styles.datePickerScroll}
                  contentContainerStyle={styles.datePickerScrollContent}
                  showsVerticalScrollIndicator={true}
                >
                  <TouchableOpacity 
                    style={[styles.datePickerItem, !filterDay && styles.datePickerItemSelected]}
                    onPress={() => setFilterDay('')}
                  >
                    <Text style={[styles.datePickerItemText, !filterDay && styles.datePickerItemTextSelected]}>
                      الكل
                    </Text>
                  </TouchableOpacity>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const dayStr = day.toString().padStart(2, '0');
                    return (
                      <TouchableOpacity 
                        key={day}
                        style={[styles.datePickerItem, filterDay === dayStr && styles.datePickerItemSelected]}
                        onPress={() => setFilterDay(dayStr)}
                      >
                        <Text style={[styles.datePickerItemText, filterDay === dayStr && styles.datePickerItemTextSelected]}>
                          {dayStr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
            
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={styles.modalAddButton}
                onPress={() => {
                  setShowDateFilterModal(false);
                  applyFilters();
                }}
              >
                <Text style={styles.modalButtonText}>تطبيق الفلتر</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setShowDateFilterModal(false)}
              >
                <Text style={styles.modalButtonText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  mainPageContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  mainPageTitle: {
    fontSize: 36,
    color: '#007AFF',
    marginBottom: 10,
  },
  mainPageSubtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  mainButtonsContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 15,
  },
  mainButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
    minHeight: 56,
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    marginVertical: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  tertiaryButton: {
    backgroundColor: '#FF9500',
  },
  quaternaryButton: {
    backgroundColor: '#AF52DE',
  },
  buttonContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  buttonTextWithIcon: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
    flexDirection: 'row',
    minHeight: 50,
    width: '40%',
    alignSelf: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  addItemModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 60, // More top padding to position higher
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: '#000000ff',
    lineHeight: 28,
    textDecorationStyle: 'double',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    marginBottom: 15,
    textAlign: 'right',
    color: '#2c3e50',
    fontWeight: '400',
    lineHeight: 20,
  },
  customerItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    flexDirection: 'row-reverse', // Arabic layout: content on right, button on left
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customerContent: {
    flex: 1,
    alignItems: 'flex-end', // Align text to the right for Arabic
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    marginBottom: 2,
  },
  customerID: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  customerDeleteButton: {
    backgroundColor: '#ff4444',
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10, // Space from content (since it's on the left in Arabic layout)
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  customerDeleteText: {
    fontSize: 18,
    color: '#fff',
  },
  // Stock Management styles
  stockItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stockItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stockItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  stockQuantity: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  stockItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stockPrice: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  stockPieces: {
    fontSize: 14,
    color: '#666',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 5,
  },
  quantityButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 40,
    textAlign: 'center',
  },
  // Display Management styles
  itemSquare: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    margin: 8,
    flex: 0.48,
    aspectRatio: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  // History styles
  historyItem: {
    backgroundColor: '#fff',
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 5,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyCustomer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    flex: 1,
    textAlign: 'right',
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    textAlign: 'left',
  },
  historyItems: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  historyTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'right',
  },
  // Sale screen styles
  subHeader: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  // Sale Item Card Styles - 3 column grid
  saleItemCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 12, // Increased padding
    margin: 4, // Reduced margin to fit larger cards
    width: '32%', // Increased width from 30% to 32%
    aspectRatio: 0.85, // Reduced aspect ratio to make cards taller
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saleItemRow: {
    justifyContent: 'space-between', // Changed from space-around for better distribution
    paddingHorizontal: 4, // Reduced padding to accommodate larger cards
  },
  saleGrid: {
    paddingBottom: 20,
    paddingTop: 10,
    paddingHorizontal: 8, // Added horizontal padding for better spacing
  },
  saleItemImage: {
   // width: '100%', // Remove fixed width
    // height: '50%', // Remove fixed height
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: 'contain',
    backgroundColor: '#f8f9fa', // Updated background color
    // Use aspectRatio and alignSelf for dynamic sizing
    aspectRatio: 1, // Keeps image square, you can adjust as needed
    alignSelf: 'center',
    width: undefined, // Let image size be determined by source
    height: 100, // Or set a max height
  },
  saleItemDetails: {
    alignItems: 'center',
    marginBottom: 6, // Reduced margin
    flex: 0, // Don't flex, use minimum space needed
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 4,
  },
  saleItemName: {
    fontSize: 14, // Slightly reduced
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3, // Reduced margin
    textAlign: 'center',
    lineHeight: 16, // Reduced line height
  },
  saleItemPrice: {
    fontSize: 14, // Increased from 12
    color: '#007AFF',
    marginBottom: 4, // Increased from 3
    fontWeight: '600',
    textAlign: 'center',
  },
  saleItemPieces: {
    fontSize: 12, // Increased from 11
    color: '#666',
    textAlign: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8, // Increased from 6
    paddingVertical: 2, // Increased from 1
    borderRadius: 6, // Increased from 4
  },
  saleQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8, // Increased padding for better touch area
    marginTop: 4,
    width: '100%',
    flex: 0, // Don't flex, use minimum space
    minHeight: 56, // Ensure minimum height for touch area
  },
  saleQuantityButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    width: 44, // iOS minimum touch target size
    height: 44, // iOS minimum touch target size
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  saleQuantityButtonText: {
    color: '#fff',
    fontSize: 16, // Increased from 14
    fontWeight: 'bold',
  },
  saleQuantityText: {
    fontSize: 18, // Increased from 15
    fontWeight: 'bold',
    color: '#333',
    minWidth: 55, // Increased from 50
    textAlign: 'center',
  },
  // Additional missing styles
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
  displayGrid: {
    paddingVertical: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  displayRow: {
    justifyContent: 'space-around',
    paddingHorizontal: 5,
  },
  stockGrid: {
    paddingVertical: 10,
  },
  stockRow: {
    justifyContent: 'space-around',
  },
  stockCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    margin: 8,
    flex: 0.48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockItemImage: {
    // width: '100%', // Remove fixed width
    // height: '50%', // Remove fixed height
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: 'contain',
    backgroundColor: '#f8f9fa', // Updated background color
    // Use aspectRatio and alignSelf for dynamic sizing
    aspectRatio: 1, // Keeps image square, you can adjust as needed
    alignSelf: 'center',
    width: undefined, // Let image size be determined by source
    height: 100, // Or set a max height
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  modalAddButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalCancelButton: {
    backgroundColor: '#8E8E93',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#8E8E93',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  // Additional modern input style
  modernInput: {
    borderWidth: 1.5,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    marginBottom: 16,
    textAlign: 'right',
    color: '#2c3e50',
    fontWeight: '500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  // Sale screen additional styles
  totalContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 15,
  },
  saleActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  saveButton: {
    backgroundColor: '#34C759',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  // Display item styles
  displayItemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    margin: 8,
    flex: 0.48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedDisplayItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
    borderWidth: 2,
    transform: [{ scale: 0.98 }],
  },
  displayItemImage: {
    // width: '100%', // Remove fixed width
    // height: '50%', // Remove fixed height
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: 'contain',
    backgroundColor: '#f8f9fa', // Updated background color
    // Use aspectRatio and alignSelf for dynamic sizing
    aspectRatio: 1, // Keeps image square, you can adjust as needed
    alignSelf: 'center',
    width: undefined, // Let image size be determined by source
    height: 100, // Or set a max height
  },
  displayItemDetails: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 20,
  },
  displayItemPrice: {
    fontSize: 15,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '600',
  },
  displayItemPieces: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#34C759',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Stock management additional styles
  stockItemInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center', 
  },
  stockCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  stockItemPrice: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  stockItemPieces: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  stockItemQuantity: {
    fontSize: 12,
    color: '#666',
  },
  stockItemActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#FF9500',
    marginBottom: 10,
    height: 45,
    width: '40%',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    marginBottom: 10,
    height: 45,
    width: '40%',
  },
  actionButtonText: {
    fontSize: 16,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#34C759',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
    flexDirection: 'row',
    minHeight: 50,
    width: '40%',
    alignSelf: 'center',
  },
  // Image picker styles
  imagePickerButton: {
    borderWidth: 2,
    borderColor: '#e1e5e9',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    backgroundColor: '#f8f9fa',
  },
  previewImage: {
    width: '100%',
    height: 80,
    borderRadius: 12,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 32,
    color: '#007AFF',
    marginBottom: 8,
  },
  imagePlaceholderLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // New styles for improved sales history
  historyItemsContainer: {
    marginVertical: 8,
    paddingLeft: 10,
  },
  historyItemText: {
    fontSize: 14,
    color: '#333',
    marginVertical: 2,
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  historyTotalContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  
  // Sales History Filter Styles
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  filterToggleButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    marginRight: 5,
  },
  filterToggleButtonActive: {
    backgroundColor: '#34C759',
  },
  filterToggleButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  filtersContent: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  dateFiltersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    textAlign: 'center',
  },
  filterButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
    marginTop: 10,
  },
  applyFilterButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
  },
  clearFilterButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  
  // History Item Delete Button
  historyDeleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  historyDeleteText: {
    fontSize: 16,
    color: '#fff',
  },
  
  // Delete Modal Styles
  modalSubHeader: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  dateSpinnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  dateSpinnerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  dateSpinnerLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  dateSpinnerInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlign: 'center',
    width: '100%',
    minWidth: 80,
  },
  warningText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
    backgroundColor: '#fff5f5',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  
  dateSpinner: {
    height: 50,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginVertical: 5,
  },
  // New styles for improved UI
  customerFilterContainer: {
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'right',
  },
  customerFilterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlign: 'right',
    minHeight: 50,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginVertical: 5,
  },
  pickerStyle: {
    height: 50,
    width: '100%',
  },
  
  // New styles for improved search and filter UI
  historyFiltersContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 0,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyFilterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  dateFilterButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 44,
    minWidth: 100,
  },
  clearAllFiltersButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 40,
    minWidth: 80,
  },
  clearFiltersButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  // Date picker modal styles
  dateFilterModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    marginVertical: 60,
    maxHeight: '75%',
    width: '90%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  datePickerContainer: {
    flexDirection: 'row',
    height: 240,
    marginVertical: 20,
    gap: 12,
  },
  datePickerColumn: {
    flex: 1,
    minWidth: 100,
  },
  datePickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  datePickerScroll: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  datePickerScrollContent: {
    paddingVertical: 5,
  },
  datePickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  datePickerItemSelected: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    borderColor: '#005BBB',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,

  },
  datePickerItemText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  datePickerItemTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  // Modern Add Button Styles
  modernAddButton: {
    backgroundColor: '#6C5CE7', // Modern purple gradient
    borderRadius: 25, // Pill shape
    paddingVertical: 18,
    paddingHorizontal: 28,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1 }], // For smooth press animations
    borderWidth: 0,
    minHeight: 60,
    width: '40%',
    alignSelf: 'center',
    marginBottom: 10,
  },
  modernButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginLeft: 8,
  },
});