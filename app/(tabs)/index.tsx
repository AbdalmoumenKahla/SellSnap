import * as ImagePicker from 'expo-image-picker';
import * as SQLite from 'expo-sqlite';
import React from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';


export default function HomeScreen() {
  // Local DB setup
  const db = SQLite.openDatabaseSync('sellsnap.db');

  type Customer = { id: number; name: string };
  type Item = { id: number; name: string; price: number; quantity: number; image: any; pieces?: number };
  type SalesHistory = { id: number; customer_name: string; items: string; total: number; date: string };

  React.useEffect(() => {
    db.execSync(
      'CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);'
    );
    db.execSync(
      'CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL, image TEXT, pieces INTEGER DEFAULT 1);'
    );
    db.execSync(
      'CREATE TABLE IF NOT EXISTS sales_history (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT, items TEXT, total REAL, date TEXT);'
    );
  }, []);

  
  const [showItems, setShowItems] = React.useState(false);
  const [items, setItems] = React.useState<Item[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [newCustomerName, setNewCustomerName] = React.useState('');
  const [showHistory, setShowHistory] = React.useState(false);
  const [salesHistory, setSalesHistory] = React.useState<SalesHistory[]>([]);
  const [showCustomerDashboard, setShowCustomerDashboard] = React.useState(false);
  const [addNewCustomerModalVisible, setAddNewCustomerModalVisible] = React.useState(false);
  const [customerQuantities, setCustomerQuantities] = React.useState<{[customerId: number]: {[itemId: number]: number}}>({});
  const [addItemModalVisible, setAddItemModalVisible] = React.useState(false);
  const [newItemName, setNewItemName] = React.useState('');
  const [newItemPrice, setNewItemPrice] = React.useState('');
  const [newItemPieces, setNewItemPieces] = React.useState('');
  const [newItemImage, setNewItemImage] = React.useState<any>(null);
  const [updateItemModalVisible, setUpdateItemModalVisible] = React.useState(false);
  const [itemsFromDb, setItemsFromDb] = React.useState<Item[]>([]);
  const [selectedItemForUpdate, setSelectedItemForUpdate] = React.useState<Item | null>(null);
  const [updateItemName, setUpdateItemName] = React.useState('');
  const [updateItemPrice, setUpdateItemPrice] = React.useState('');
  const [updateItemImage, setUpdateItemImage] = React.useState<any>(null);
  const [searchCustomerText, setSearchCustomerText] = React.useState('');
  const [historySearchText, setHistorySearchText] = React.useState('');
  const [historyDateFilter, setHistoryDateFilter] = React.useState('');
  const [deleteDateYear, setDeleteDateYear] = React.useState('');
  const [deleteDateMonth, setDeleteDateMonth] = React.useState('');
  const [deleteDateDay, setDeleteDateDay] = React.useState('');
  const [showDeleteHistoryModal, setShowDeleteHistoryModal] = React.useState(false);
  const [filterYear, setFilterYear] = React.useState('');
  const [filterMonth, setFilterMonth] = React.useState('');
  const [filterDay, setFilterDay] = React.useState('');
  const [showDateFilterModal, setShowDateFilterModal] = React.useState(false);

  // Load customers from DB
  React.useEffect(() => {
    try {
      const rows = db.getAllSync('SELECT * FROM customers;');
      setCustomers(rows as Customer[] ?? []);
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  }, [showCustomerDashboard, addNewCustomerModalVisible]);

  // Load all items from database
  const loadAllItemsFromDb = () => {
    try {
      const rows = db.getAllSync('SELECT * FROM items;');
      console.log('Loaded items from DB:', rows);
      const dbItems = (rows as any[]).map(row => ({
        id: row.id,
        name: row.name,
        price: row.price,
        quantity: 0,
        image: row.image ? JSON.parse(row.image) : require('@/assets/images/icon.png'),
        pieces: row.pieces || 1
      }));
      console.log('Processed items:', dbItems);
      setItems(dbItems);
    } catch (error) {
      console.error('Error loading items from database:', error);
      setItems([]);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDashboard(false);
    loadAllItemsFromDb(); // Load items from database
    setShowItems(true);
  };

  const handleAddCustomer = () => {
    if (!newCustomerName.trim()) return;
    try {
      const result = db.runSync('INSERT INTO customers (name) VALUES (?);', newCustomerName);
      const newCustomer: Customer = { id: result.lastInsertRowId, name: newCustomerName };
      setCustomers([...customers, newCustomer]);
      setNewCustomerName('');
      setAddNewCustomerModalVisible(false);
      Alert.alert('نجح', 'تم إضافة العميل بنجاح!');
    } catch (error) {
      console.error('Error adding customer:', error);
      Alert.alert('خطأ', 'فشل في إضافة العميل');
    }
  };

  const showExistingCustomers = () => {
    setShowCustomerDashboard(true);
  };

  const showAddNewCustomerModal = () => {
    setAddNewCustomerModalVisible(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف العميل "${customer.name}"؟`,
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            try {
              db.runSync('DELETE FROM customers WHERE id = ?;', customer.id);
              setCustomers(customers.filter(c => c.id !== customer.id));
              Alert.alert('نجح', 'تم حذف العميل بنجاح!');
            } catch (error) {
              console.error('Error deleting customer:', error);
              Alert.alert('خطأ', 'فشل في حذف العميل');
            }
          },
        },
      ]
    );
  };

  const getFilteredCustomers = () => {
    if (!searchCustomerText.trim()) {
      return customers;
    }
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(searchCustomerText.toLowerCase())
    );
  };

  const getFilteredHistory = () => {
    let filtered = salesHistory;

    // Filter by customer name
    if (historySearchText.trim()) {
      filtered = filtered.filter(sale => 
        sale.customer_name.toLowerCase().includes(historySearchText.toLowerCase())
      );
    }

    // Filter by selected date components
    if (filterYear || filterMonth || filterDay) {
      filtered = filtered.filter(sale => {
        // Parse the date string format: "MM/DD/YYYY, HH:MM:SS AM/PM"
        const dateStr = sale.date;
        
        // Extract date parts from the format like "09/09/2025, 12:30:45 PM"
        const datePart = dateStr.split(',')[0]; // Get "09/09/2025"
        const [month, day, year] = datePart.split('/');
        
        let matches = true;
        
        if (filterYear && year !== filterYear) {
          matches = false;
        }
        if (filterMonth && month !== filterMonth.padStart(2, '0')) {
          matches = false;
        }
        if (filterDay && day !== filterDay.padStart(2, '0')) {
          matches = false;
        }
        
        return matches;
      });
    }

    return filtered;
  };

  const applyDateFilter = () => {
    let dateDescription = '';
    if (filterYear) {
      dateDescription = filterYear;
      if (filterMonth) {
        dateDescription = `${filterMonth}/${filterYear}`;
        if (filterDay) {
          dateDescription = `${filterDay}/${filterMonth}/${filterYear}`;
        }
      }
    }
    setHistoryDateFilter(dateDescription);
    setShowDateFilterModal(false);
  };

  const clearDateFilter = () => {
    setFilterYear('');
    setFilterMonth('');
    setFilterDay('');
    setHistoryDateFilter('');
  };

  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 10; i--) {
      years.push(i.toString());
    }
    return years;
  };

  const generateMonths = () => {
    return Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  };

  const generateDays = () => {
    const daysInMonth = filterMonth ? new Date(parseInt(filterYear || '2024'), parseInt(filterMonth), 0).getDate() : 31;
    return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));
  };

  const handleDeleteHistoryByDate = () => {
    if (!deleteDateYear.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال السنة على الأقل');
      return;
    }

    let datePattern = deleteDateYear;
    let dateDescription = `سنة ${deleteDateYear}`;

    if (deleteDateMonth.trim()) {
      // Ensure month is 2 digits
      const month = deleteDateMonth.padStart(2, '0');
      // For MM/DD/YYYY format, we need to match month at the beginning
      datePattern = `${month}/`;
      dateDescription = `شهر ${deleteDateMonth}/${deleteDateYear}`;
      
      if (deleteDateDay.trim()) {
        // Ensure day is 2 digits
        const day = deleteDateDay.padStart(2, '0');
        // Match exact MM/DD/YYYY pattern
        datePattern = `${month}/${day}/${deleteDateYear}`;
        dateDescription = `يوم ${deleteDateDay}/${deleteDateMonth}/${deleteDateYear}`;
      } else {
        // Just month and year: match MM/??/YYYY
        datePattern = `${month}/.*/${deleteDateYear}`;
      }
    } else {
      // Just year: match any date ending with the year
      datePattern = `.*/${deleteDateYear}`;
    }

    Alert.alert(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف جميع سجلات المبيعات لـ ${dateDescription}؟`,
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            try {
              // Use GLOB pattern for SQLite
              let globPattern = '';
              if (deleteDateMonth.trim() && deleteDateDay.trim()) {
                // Exact date: MM/DD/YYYY*
                const month = deleteDateMonth.padStart(2, '0');
                const day = deleteDateDay.padStart(2, '0');
                globPattern = `${month}/${day}/${deleteDateYear}*`;
              } else if (deleteDateMonth.trim()) {
                // Month and year: MM/*/YYYY*
                const month = deleteDateMonth.padStart(2, '0');
                globPattern = `${month}/*/${deleteDateYear}*`;
              } else {
                // Just year: */YYYY*
                globPattern = `*/${deleteDateYear}*`;
              }
              
              const result = db.runSync(
                'DELETE FROM sales_history WHERE date GLOB ?;',
                globPattern
              );
              
              // Reload sales history
              const rows = db.getAllSync('SELECT * FROM sales_history ORDER BY id DESC;');
              setSalesHistory(rows as SalesHistory[]);
              
              // Reset form
              setDeleteDateYear('');
              setDeleteDateMonth('');
              setDeleteDateDay('');
              setShowDeleteHistoryModal(false);
              
              Alert.alert('نجح', `تم حذف ${result.changes} سجل مبيعات بنجاح!`);
            } catch (error) {
              console.error('Error deleting history:', error);
              Alert.alert('خطأ', 'فشل في حذف السجلات');
            }
          },
        },
      ]
    );
  };

  // Get items with customer-specific quantities
  const getItemsWithCustomerQuantities = () => {
    if (!selectedCustomer) return items;
    
    const customerQty = customerQuantities[selectedCustomer.id] || {};
    return items.map(item => ({
      ...item,
      quantity: customerQty[item.id] || 0
    }));
  };

  // Update quantity for specific customer and item
  const updateCustomerQuantity = (itemId: number, newQuantity: number) => {
    if (!selectedCustomer) return;
    
    setCustomerQuantities(prev => ({
      ...prev,
      [selectedCustomer.id]: {
        ...prev[selectedCustomer.id],
        [itemId]: Math.max(0, newQuantity)
      }
    }));
  };

  const saveSaleToHistory = () => {
    if (!selectedCustomer) return;
    
    const itemsWithQty = getItemsWithCustomerQuantities();
    const soldItems = itemsWithQty.filter(item => item.quantity > 0);
    if (soldItems.length === 0) return;

    const itemsText = soldItems.map(item => `${item.name} (${item.quantity}x${item.price})`).join(', ');
    const total = soldItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const currentDate = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    try {
      db.runSync(
        'INSERT INTO sales_history (customer_name, items, total, date) VALUES (?, ?, ?, ?);',
        selectedCustomer.name, itemsText, total, currentDate
      );
      
      // Reset quantities for this customer after saving
      setCustomerQuantities(prev => ({
        ...prev,
        [selectedCustomer.id]: {}
      }));
      
      alert('تم حفظ البيع بنجاح!');
    } catch (error) {
      console.error('Error saving sale:', error);
      alert('خطأ في حفظ البيع');
    }
  };

  const loadSalesHistory = () => {
    try {
      const rows = db.getAllSync('SELECT * FROM sales_history ORDER BY id DESC;');
      setSalesHistory(rows as SalesHistory[]);
      setShowHistory(true);
    } catch (error) {
      console.error('Error loading sales history:', error);
      setSalesHistory([]);
      setShowHistory(true);
    }
  };

  const pickImageForItem = async (itemId: number) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('إذن مطلوب', 'نحتاج إذن للوصول إلى معرض الصور');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setItems(items.map(item =>
        item.id === itemId ? { ...item, image: { uri: result.assets[0].uri } } : item
      ));
    }
  };

  const pickImageForNewItem = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('إذن مطلوب', 'نحتاج إذن للوصول إلى معرض الصور');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setNewItemImage({ uri: result.assets[0].uri });
    }
  };

  const handleAddNewItem = () => {
    if (!newItemName.trim() || !newItemPrice.trim() || !newItemPieces.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الصنف والسعر وعدد القطع');
      return;
    }

    const price = parseFloat(newItemPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال سعر صحيح');
      return;
    }

    const pieces = parseInt(newItemPieces);
    if (isNaN(pieces) || pieces <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال عدد قطع صحيح');
      return;
    }

    try {
      const imageUri = newItemImage ? JSON.stringify(newItemImage) : null;
      const result = db.runSync(
        'INSERT INTO items (name, price, image, pieces) VALUES (?, ?, ?, ?);',
        newItemName, price, imageUri, pieces
      );

      const newItem: Item = {
        id: result.lastInsertRowId,
        name: newItemName,
        price: price,
        quantity: 0,
        image: newItemImage || require('@/assets/images/icon.png'),
        pieces: pieces
      };

      setItems([...items, newItem]);
      setNewItemName('');
      setNewItemPrice('');
      setNewItemPieces('');
      setNewItemImage(null);
      setAddItemModalVisible(false);
      Alert.alert('نجح', 'تم إضافة الصنف بنجاح!');
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('خطأ', 'فشل في إضافة الصنف');
    }
  };

  const loadItemsFromDb = () => {
    try {
      const rows = db.getAllSync('SELECT * FROM items;');
      const dbItems = (rows as any[]).map(row => ({
        id: row.id,
        name: row.name,
        price: row.price,
        quantity: 0,
        image: row.image ? JSON.parse(row.image) : require('@/assets/images/icon.png'),
        pieces: row.pieces || 1
      }));
      setItemsFromDb(dbItems);
      setUpdateItemModalVisible(true);
    } catch (error) {
      console.error('Error loading items from database:', error);
      setItemsFromDb([]);
      setUpdateItemModalVisible(true);
    }
  };

  const handleSelectItemForUpdate = (item: Item) => {
    setSelectedItemForUpdate(item);
    setUpdateItemName(item.name);
    setUpdateItemPrice(item.price.toString());
    setUpdateItemImage(item.image);
  };

  const pickImageForUpdateItem = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('إذن مطلوب', 'نحتاج إذن للوصول إلى معرض الصور');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setUpdateItemImage({ uri: result.assets[0].uri });
    }
  };

  const handleRemoveItem = (item: Item) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف الصنف "${item.name}"؟`,
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            try {
              db.runSync('DELETE FROM items WHERE id = ?;', item.id);
              
              // Remove from main items array
              setItems(items.filter(i => i.id !== item.id));
              
              // Remove from itemsFromDb array
              setItemsFromDb(itemsFromDb.filter(i => i.id !== item.id));
              
              // Reset form if this item was selected for update
              if (selectedItemForUpdate?.id === item.id) {
                setSelectedItemForUpdate(null);
                setUpdateItemName('');
                setUpdateItemPrice('');
                setUpdateItemImage(null);
              }
              
              Alert.alert('نجح', 'تم حذف الصنف بنجاح!');
            } catch (error) {
              console.error('Error removing item:', error);
              Alert.alert('خطأ', 'فشل في حذف الصنف');
            }
          },
        },
      ]
    );
  };

  const handleUpdateItem = () => {
    if (!selectedItemForUpdate) return;
    
    if (!updateItemName.trim() || !updateItemPrice.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الصنف والسعر');
      return;
    }

    const price = parseFloat(updateItemPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال سعر صحيح');
      return;
    }

    try {
      const imageUri = updateItemImage ? JSON.stringify(updateItemImage) : null;
      db.runSync(
        'UPDATE items SET name = ?, price = ?, image = ? WHERE id = ?;',
        updateItemName, price, imageUri, selectedItemForUpdate.id
      );

      // Update the item in the main items array
      const updatedItem: Item = {
        ...selectedItemForUpdate,
        name: updateItemName,
        price: price,
        image: updateItemImage
      };

      setItems(items.map(item => 
        item.id === selectedItemForUpdate.id ? updatedItem : item
      ));

      // Update the items from database array
      setItemsFromDb(itemsFromDb.map(item => 
        item.id === selectedItemForUpdate.id ? updatedItem : item
      ));

      // Reset form
      setSelectedItemForUpdate(null);
      setUpdateItemName('');
      setUpdateItemPrice('');
      setUpdateItemImage(null);
      
      Alert.alert('نجح', 'تم تحديث الصنف بنجاح!');
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert('خطأ', 'فشل في تحديث الصنف');
    }
  };

  const handleIncrement = (id: number) => {
    if (!selectedCustomer) return;
    const currentQty = customerQuantities[selectedCustomer.id]?.[id] || 0;
    updateCustomerQuantity(id, currentQty + 1);
  };

  const handleDecrement = (id: number) => {
    if (!selectedCustomer) return;
    const currentQty = customerQuantities[selectedCustomer.id]?.[id] || 0;
    updateCustomerQuantity(id, currentQty - 1);
  };

  // Calculate total based on customer-specific quantities
  const getTotal = () => {
    if (!selectedCustomer) return 0;
    const itemsWithQty = getItemsWithCustomerQuantities();
    return itemsWithQty.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  if (showItems && selectedCustomer) {
    const itemsWithQty = getItemsWithCustomerQuantities();
    console.log('Items to display:', itemsWithQty);
    console.log('Items length:', itemsWithQty.length);
    
    return (
      <>
        <ScrollView style={styles.container}>
          {/* Header */}
          <Text style={[styles.header, { marginTop: 20, marginBottom: 20 }]}>العميل: {selectedCustomer.name}</Text>
          
          {/* Debug Info */}
          <Text style={{ textAlign: 'center', marginBottom: 10, fontSize: 16 }}>عدد الأصناف: {itemsWithQty.length}</Text>
          
          {/* Items Grid */}
          <FlatList
            data={itemsWithQty}
            numColumns={2}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.itemSquare}>
                <TouchableOpacity onPress={() => pickImageForItem(item.id)}>
                  <Image 
                    source={item.image} 
                    style={styles.itemImage} 
                  />
                </TouchableOpacity>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>السعر: {item.price}</Text>        
                <Text style={styles.quantityLabel}>عدد الحبات: {item.pieces || 1}</Text>

                {/* Quantity Controls */}
                <View style={styles.quantityContainer}>
                  <TouchableOpacity 
                    onPress={() => handleDecrement(item.id)} 
                    style={styles.quantityButton}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  
                  <TouchableOpacity 
                    onPress={() => handleIncrement(item.id)} 
                    style={styles.quantityButton}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={styles.gridContainer}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, color: '#666', textAlign: 'center' }}>لا توجد أصناف محفوظة</Text>
                <Text style={{ fontSize: 14, color: '#888', marginTop: 5 }}>يرجى إضافة أصناف أولاً</Text>
              </View>
            }
          />
          
          {/* Total and Save Button */}
          <View style={styles.bottomContainer}>
            <Text style={styles.total}>الإجمالي: {getTotal()}</Text>
            <TouchableOpacity style={styles.saveButton} onPress={saveSaleToHistory}>
              <Text style={styles.buttonText}>حفظ البيع</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mainButton, { backgroundColor: '#aaa', marginTop: 10 }]} onPress={() => setShowItems(false)}>
              <Text style={styles.buttonText}>العودة</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        {renderModals()}
      </>
    );
  }

  if (showHistory) {
    return (
      <>
        <View style={styles.historyContainer}>
          {/* Header with back button */}
          <View style={styles.historyHeader}>
            <TouchableOpacity 
              style={styles.historyBackButton} 
              onPress={() => setShowHistory(false)}
            >
              <Text style={styles.historyBackButtonText}>← العودة</Text>
            </TouchableOpacity>
            <Text style={styles.historyTitle}>تاريخ المبيعات</Text>
            <TouchableOpacity 
              style={styles.deleteHistoryButton} 
              onPress={() => setShowDeleteHistoryModal(true)}
            >
              <Text style={styles.deleteHistoryButtonText}>🗑️ حذف السجلات</Text>
            </TouchableOpacity>
          </View>

          {/* Search and Filter Controls */}
          <View style={styles.historyFiltersContainer}>
            <View style={styles.historySearchContainer}>
              <TextInput
                style={styles.historySearchInput}
                placeholder="ابحث بالعميل..."
                value={historySearchText}
                onChangeText={setHistorySearchText}
                placeholderTextColor="#999"
              />
              {historySearchText.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearSearchButton} 
                  onPress={() => setHistorySearchText('')}
                >
                  <Text style={styles.clearSearchText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.historyDateContainer}>
              <TouchableOpacity 
                style={styles.dateFilterButton}
                onPress={() => setShowDateFilterModal(true)}
              >
                <Text style={styles.dateFilterText}>
                  {historyDateFilter || 'فلتر بالتاريخ'}
                </Text>
                <Text style={styles.dateFilterIcon}>📅</Text>
              </TouchableOpacity>
              {historyDateFilter.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearSearchButton} 
                  onPress={clearDateFilter}
                >
                  <Text style={styles.clearSearchText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* History List */}
          <FlatList
            data={getFilteredHistory()}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.historyListContent}
            renderItem={({ item }) => (
              <View style={styles.historyItem}>
                <View style={styles.historyItemHeader}>
                  <Text style={styles.historyCustomer}>العميل: {item.customer_name}</Text>
                  <Text style={styles.historyDate}>{item.date}</Text>
                </View>
                
                <View style={styles.historyItemsContainer}>
                  <Text style={styles.historyItemsTitle}>الأصناف المباعة:</Text>
                  {item.items.split(', ').map((itemDetail, index) => (
                    <Text key={index} style={styles.historyItemDetail}>• {itemDetail}</Text>
                  ))}
                </View>
                
                <View style={styles.historyFooter}>
                  <Text style={styles.historyTotal}>الإجمالي: {item.total} شيكل</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyHistoryView}>
                <Text style={styles.emptyHistoryIcon}>📊</Text>
                <Text style={styles.emptyHistoryTitle}>لا توجد سجلات</Text>
                <Text style={styles.emptyHistoryMessage}>
                  {(historySearchText || historyDateFilter) 
                    ? 'لا توجد سجلات تطابق معايير البحث المحددة' 
                    : 'لا يوجد تاريخ مبيعات حتى الآن'
                  }
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={true}
          />
        </View>
        {renderModals()}
      </>
    );
  }

  if (showCustomerDashboard) {
    return (
      <>
        <View style={styles.customerDashboardContainer}>
          {/* Header Section */}
          <View style={styles.customerDashboardHeader}>
            <View style={styles.customerDashboardHeaderContent}>
              <Text style={styles.customerDashboardTitle}>إدارة العملاء</Text>
              <Text style={styles.customerDashboardSubtitle}>اختر عميل موجود أو أضف عميل جديد</Text>
            </View>
            <TouchableOpacity 
              style={styles.addCustomerButton} 
              onPress={showAddNewCustomerModal}
            >
              <Text style={styles.addCustomerButtonText}>+ عميل جديد</Text>
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <View style={styles.customerDashboardContent}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="ابحث عن عميل..."
                value={searchCustomerText}
                onChangeText={setSearchCustomerText}
                placeholderTextColor="#999"
              />
              {searchCustomerText.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearSearchButton} 
                  onPress={() => setSearchCustomerText('')}
                >
                  <Text style={styles.clearSearchText}>×</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView 
              style={styles.customerScrollView}
              contentContainerStyle={styles.customerScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {getFilteredCustomers().length > 0 ? (
                <View style={styles.customersGrid}>
                  {getFilteredCustomers().map((customer) => (
                    <View key={customer.id} style={styles.customerCardWrapper}>
                      <TouchableOpacity 
                        style={styles.customerCard} 
                        onPress={() => handleSelectCustomer(customer)}
                      >
                        <View style={styles.customerCardContent}>
                          <View style={styles.customerAvatar}>
                            <Text style={styles.customerAvatarText}>
                              {customer.name.charAt(0)}
                            </Text>
                          </View>
                          <View style={styles.customerCardInfo}>
                            <Text style={styles.customerCardName}>{customer.name}</Text>
                            <Text style={styles.customerCardId}>معرف العميل: #{customer.id}</Text>
                          </View>
                        </View>
                        <View style={styles.customerCardAction}>
                          <Text style={styles.customerCardActionText}>اختيار</Text>
                          <Text style={styles.customerCardActionIcon}>→</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.deleteCustomerButton} 
                        onPress={() => handleDeleteCustomer(customer)}
                      >
                        <Text style={styles.deleteCustomerButtonText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyCustomersView}>
                  {searchCustomerText.length > 0 ? (
                    <>
                      <Text style={styles.emptyCustomersIcon}>�</Text>
                      <Text style={styles.emptyCustomersTitle}>لا توجد نتائج</Text>
                      <Text style={styles.emptyCustomersMessage}>لم يتم العثور على عملاء يطابقون البحث "{searchCustomerText}"</Text>
                      <TouchableOpacity 
                        style={styles.emptyStateAddButton} 
                        onPress={() => setSearchCustomerText('')}
                      >
                        <Text style={styles.emptyStateAddButtonText}>مسح البحث</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.emptyCustomersIcon}>�👥</Text>
                      <Text style={styles.emptyCustomersTitle}>لا يوجد عملاء بعد</Text>
                      <Text style={styles.emptyCustomersMessage}>ابدأ بإضافة عميلك الأول لتتمكن من إدارة المبيعات</Text>
                      <TouchableOpacity 
                        style={styles.emptyStateAddButton} 
                        onPress={showAddNewCustomerModal}
                      >
                        <Text style={styles.emptyStateAddButtonText}>+ إضافة العميل الأول</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </ScrollView>
          </View>

          {/* Footer */}
          <View style={styles.customerDashboardFooter}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => setShowCustomerDashboard(false)}
            >
              <Text style={styles.backButtonText}>← العودة للرئيسية</Text>
            </TouchableOpacity>
          </View>
        </View>
        {renderModals()}
      </>
    );
  }

  return (
    <>
      <View style={[styles.container, styles.mainPageContainer]}>
        <View style={styles.mainPageContent}>
          <Text style={[styles.header, styles.mainPageTitle]}>SellSnap</Text>
          <Text style={styles.mainPageSubtitle}>نظام إدارة المبيعات المتطور</Text>
          
          <View style={styles.mainButtonsContainer}>
            <TouchableOpacity style={[styles.mainButton, styles.primaryButton]} onPress={showExistingCustomers}>
              <View style={styles.buttonContentContainer}>
                <Text style={styles.buttonIcon}>🛒</Text>
                <Text style={styles.buttonTextWithIcon}>بدء الحركة</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mainButton, styles.secondaryButton]} onPress={() => setAddItemModalVisible(true)}>
              <View style={styles.buttonContentContainer}>
                <Text style={styles.buttonIcon}>➕</Text>
                <Text style={styles.buttonTextWithIcon}>إضافة صنف جديد</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mainButton, styles.tertiaryButton]} onPress={loadItemsFromDb}>
              <View style={styles.buttonContentContainer}>
                <Text style={styles.buttonIcon}>✏️</Text>
                <Text style={styles.buttonTextWithIcon}>تحديث معلومات الأصناف</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mainButton, styles.quaternaryButton]} onPress={loadSalesHistory}>
              <View style={styles.buttonContentContainer}>
                <Text style={styles.buttonIcon}>📊</Text>
                <Text style={styles.buttonTextWithIcon}>تاريخ المبيعات</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {renderModals()}
    </>
  );

  function renderModals() {
    return (
      <>
        {/* Add New Customer Modal */}
        <Modal visible={addNewCustomerModalVisible} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalHeader}>إضافة عميل جديد</Text>
              
              <TextInput
                style={styles.input}
                placeholder="اسم العميل"
                value={newCustomerName}
                onChangeText={setNewCustomerName}
              />
              
              <TouchableOpacity style={styles.mainButton} onPress={handleAddCustomer}>
                <Text style={styles.buttonText}>إضافة العميل</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.mainButton, { backgroundColor: '#aaa' }]} 
                onPress={() => {
                  setAddNewCustomerModalVisible(false);
                  setNewCustomerName('');
                }}
              >
                <Text style={styles.buttonText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Add Item Modal */}
        <Modal visible={addItemModalVisible} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.addItemModalContent}>
              <Text style={styles.modalHeader}>إضافة صنف جديد</Text>
            
              <TouchableOpacity style={styles.imagePickerButton} onPress={pickImageForNewItem}>
                {newItemImage ? (
                  <Image source={newItemImage} style={styles.previewImage} />
                ) : (
                  <Text style={styles.imagePickerText}>اختر صورة الصنف</Text>
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="اسم الصنف"
                value={newItemName}
                onChangeText={setNewItemName}
              />
              
              <TextInput
                style={styles.input}
                placeholder="السعر"
                value={newItemPrice}
                onChangeText={setNewItemPrice}
                keyboardType="numeric"
              />
              
              <TextInput
                style={styles.input}
                placeholder="عدد القطع في الصنف"
                value={newItemPieces}
                onChangeText={setNewItemPieces}
                keyboardType="numeric"
              />
              
              <TouchableOpacity style={styles.mainButton} onPress={handleAddNewItem}>
                <Text style={[styles.buttonText, { color: '#fff' }]}>إضافة الصنف</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.mainButton, { backgroundColor: '#aaa' }]} 
                onPress={() => {
                  setAddItemModalVisible(false);
                  setNewItemName('');
                  setNewItemPrice('');
                  setNewItemPieces('');
                  setNewItemImage(null);
                }}
              >
                <Text style={[styles.buttonText, { color: '#fff' }]}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Date Filter Modal */}
        <Modal visible={showDateFilterModal} animationType="slide" transparent>
          <View style={styles.modalContainer}>
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
                        key={month}
                        style={[styles.datePickerItem, filterMonth === month && styles.datePickerItemSelected]}
                        onPress={() => setFilterMonth(month)}
                      >
                        <Text style={[styles.datePickerItemText, filterMonth === month && styles.datePickerItemTextSelected]}>
                          {month}
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
                    {generateDays().map((day) => (
                      <TouchableOpacity 
                        key={day}
                        style={[styles.datePickerItem, filterDay === day && styles.datePickerItemSelected]}
                        onPress={() => setFilterDay(day)}
                      >
                        <Text style={[styles.datePickerItemText, filterDay === day && styles.datePickerItemTextSelected]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
              
              <View style={styles.dateFilterActions}>
                <TouchableOpacity style={styles.mainButton} onPress={applyDateFilter}>
                  <Text style={styles.buttonText}>تطبيق الفلتر</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.mainButton, { backgroundColor: '#ff6b6b' }]} 
                  onPress={clearDateFilter}
                >
                  <Text style={styles.buttonText}>مسح الفلتر</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.mainButton, { backgroundColor: '#aaa' }]} 
                  onPress={() => setShowDateFilterModal(false)}
                >
                  <Text style={styles.buttonText}>إلغاء</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Delete History Modal */}
        <Modal visible={showDeleteHistoryModal} animationType="slide" transparent>
          <View style={styles.modalContainer}>
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
              
              <View style={styles.deleteHistoryInfo}>
                <Text style={styles.deleteHistoryInfoText}>
                  💡 يمكنك حذف السجلات بحسب:
                </Text>
                <Text style={styles.deleteHistoryInfoItem}>• السنة فقط (مثال: 2024)</Text>
                <Text style={styles.deleteHistoryInfoItem}>• السنة والشهر (مثال: 2024 + 09)</Text>
                <Text style={styles.deleteHistoryInfoItem}>• السنة والشهر واليوم (مثال: 2024 + 09 + 15)</Text>
              </View>
              
              <TouchableOpacity 
                style={[styles.mainButton, { backgroundColor: '#ff4444' }]} 
                onPress={handleDeleteHistoryByDate}
              >
                <Text style={styles.buttonText}>حذف السجلات</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.mainButton, { backgroundColor: '#aaa' }]} 
                onPress={() => {
                  setShowDeleteHistoryModal(false);
                  setDeleteDateYear('');
                  setDeleteDateMonth('');
                  setDeleteDateDay('');
                }}
              >
                <Text style={styles.buttonText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Update Item Modal */}
        <Modal visible={updateItemModalVisible} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { width: 450, height: '85%', paddingTop: 20 }]}>
              <Text style={[styles.modalHeader]}>تحديث معلومات الأصناف</Text>
              
              {!selectedItemForUpdate ? (
                <>
                  <Text style={[styles.itemText, { marginBottom: 15, fontSize: 16 }]}>اختر صنف للتحديث:</Text>
                  <FlatList
                    data={itemsFromDb}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    renderItem={({ item }) => (
                      <View style={styles.itemSelectContainer}>
                        <TouchableOpacity 
                          style={styles.itemSelectButton} 
                          onPress={() => handleSelectItemForUpdate(item)}
                        >
                          <Image source={item.image} style={styles.smallItemImage} />
                          <View style={styles.itemSelectInfo}>
                            <Text style={styles.itemSelectName}>{item.name}</Text>
                            <Text style={styles.itemSelectPrice}>السعر: {item.price}</Text>
                            <Text style={styles.itemSelectPrice}>عدد القطع: {item.pieces || 1}</Text>
                          </View>
                          <Text style={styles.selectText}>تحديث ←</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.removeButton} 
                          onPress={() => handleRemoveItem(item)}
                        >
                          <Text style={styles.removeButtonText}>حذف</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    ListEmptyComponent={<Text style={styles.itemText}>لا توجد أصناف محفوظة</Text>}
                    showsVerticalScrollIndicator={true}
                    ListFooterComponent={
                      <TouchableOpacity 
                        style={[styles.mainButton, { backgroundColor: '#aaa', marginTop: 10 }]} 
                        onPress={() => setUpdateItemModalVisible(false)}
                      >
                        <Text style={styles.buttonText}>إلغاء</Text>
                      </TouchableOpacity>
                    }
                  />
                </>
              ) : (
                <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={[styles.itemText, { marginBottom: 15 }]}>تحديث: {selectedItemForUpdate?.name}</Text>
                  
                  <TouchableOpacity style={styles.imagePickerButton} onPress={pickImageForUpdateItem}>
                    <Image source={updateItemImage} style={styles.previewImage} />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.input}
                    placeholder="اسم الصنف"
                    value={updateItemName}
                    onChangeText={setUpdateItemName}
                  />
                  
                  <TextInput
                    style={styles.input}
                    placeholder="السعر"
                    value={updateItemPrice}
                    onChangeText={setUpdateItemPrice}
                    keyboardType="numeric"
                  />
                  
                  <TouchableOpacity style={styles.mainButton} onPress={handleUpdateItem}>
                    <Text style={styles.buttonText}>حفظ التحديث</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.mainButton, { backgroundColor: '#aaa' }]} 
                    onPress={() => {
                      setSelectedItemForUpdate(null);
                      setUpdateItemName('');
                      setUpdateItemPrice('');
                      setUpdateItemImage(null);
                    }}
                  >
                    <Text style={styles.buttonText}>العودة للقائمة</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 40,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  modalHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 20,
    color: '#1a1a1a',
    width: '100%',
  },
  gridContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSquare: {
    backgroundColor: '#ffffff',
    margin: 15,
    padding: 20,
    borderRadius: 16,
    width: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemPieces: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
    fontWeight: 'bold',
  },
  quantityLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quantityButton: {
    backgroundColor: '#007AFF',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 15,
    minWidth: 30,
    textAlign: 'center',
  },
  bottomContainer: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  total: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    minWidth: 200,
  },
  mainButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 50,
    paddingVertical: 24,
    borderRadius: 16,
    marginVertical: 10,
    width: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonTextWithIcon: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
    paddingLeft: 60,
  },
  buttonContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  buttonIcon: {
    fontSize: 32,
    position: 'absolute',
    left: 20,
    zIndex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#f2f2f2',
    padding: 12,
    borderRadius: 8,
    width: 350,
    justifyContent: 'space-between',
  },
  itemText: {
    fontSize: 16,
    marginHorizontal: 8,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: '#eee',
    padding: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    width: 400,
    maxHeight: '70%',
    alignItems: 'center',
  },
  addItemModalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    width: 420,
    alignItems: 'center',
  },
  customerButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    width: 200,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
    width: 280,
    fontSize: 16,
    textAlign: 'center',
  },
  historyItem: {
    backgroundColor: '#ffffff',
    padding: 24,
    marginVertical: 12,
    borderRadius: 16,
    width: 450,
    alignSelf: 'center',
    borderLeftWidth: 6,
    borderLeftColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  imagePickerButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  imagePickerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  itemSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  itemSelectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    marginHorizontal: 4,
    width: '100%',
  },
  removeButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  smallItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  itemSelectInfo: {
    flex: 1,
  },
  itemSelectName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  itemSelectPrice: {
    fontSize: 14,
    color: '#666',
  },
  customerDashboardActions: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  customerDashboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 16,
    marginVertical: 6,
    borderRadius: 12,
    width: 350,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  customerId: {
    fontSize: 14,
    color: '#666',
  },
  selectText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  emptyCustomersContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    margin: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  emptyCustomersText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyCustomersSubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  
  // New iPad-optimized styles
  mainPageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
    paddingHorizontal: 40,
    backgroundColor: '#f8f9fa',
  },
  mainPageContent: {
    alignItems: 'center',
    maxWidth: 600,
    width: '100%',
  },
  mainPageTitle: {
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 8,
    color: '#1a1a1a',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  mainPageSubtitle: {
    fontSize: 20,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
    fontWeight: '500',
  },
  mainButtonsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 20,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  secondaryButton: {
    backgroundColor: '#34C759',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tertiaryButton: {
    backgroundColor: '#FF9500',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  quaternaryButton: {
    backgroundColor: '#AF52DE',
    shadowColor: '#AF52DE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  // History styles
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  historyCustomer: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  historyItemsContainer: {
    marginBottom: 16,
  },
  historyItemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 8,
  },
  historyItemDetail: {
    fontSize: 15,
    color: '#444',
    marginBottom: 4,
    paddingLeft: 8,
    lineHeight: 22,
  },
  historyFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  historyTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  // New Customer Dashboard Styles
  customerDashboardContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  customerDashboardHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 30,
    paddingVertical: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  customerDashboardHeaderContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  customerDashboardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
    textAlign: 'right',
  },
  customerDashboardSubtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
    textAlign: 'right',
  },
  addCustomerButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addCustomerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  customerDashboardContent: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
  },
  customerScrollView: {
    flex: 1,
  },
  customerScrollContent: {
    paddingBottom: 20,
  },
  customersGrid: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  customerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  customerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerAvatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  customerAvatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  customerCardInfo: {
    flex: 1,
  },
  customerCardName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  customerCardId: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  customerCardAction: {
    alignItems: 'center',
    paddingLeft: 16,
  },
  customerCardActionText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  customerCardActionIcon: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  emptyCustomersView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyCustomersIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyCustomersTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyCustomersMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
    maxWidth: 400,
  },
  emptyStateAddButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  emptyStateAddButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  customerDashboardFooter: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },

  // Search and Delete Customer Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginBottom: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: '#333',
    textAlign: 'right',
  },
  clearSearchButton: {
    position: 'absolute',
    left: 12,
    backgroundColor: '#f0f0f0',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  customerCardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
    maxWidth: 600,
  },
  deleteCustomerButton: {
    backgroundColor: '#ff4444',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteCustomerButtonText: {
    fontSize: 20,
    color: '#ffffff',
  },

  // History Container and Layout Styles
  historyContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 40,
  },
  historyHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyBackButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  historyBackButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  historyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    flex: 1,
  },
  deleteHistoryButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteHistoryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // History Filters Styles
  historyFiltersContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    gap: 15,
  },
  historySearchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  historySearchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
    color: '#333',
    textAlign: 'right',
  },
  historyDateContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  historyDateInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
    color: '#333',
    textAlign: 'right',
  },
  dateFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  dateFilterText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
  },
  dateFilterIcon: {
    fontSize: 16,
    marginLeft: 8,
  },

  // History List Styles
  historyListContent: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },

  // Empty History Styles
  emptyHistoryView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyHistoryIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyHistoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyHistoryMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },

  // Delete History Modal Styles
  deleteHistoryInfo: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 8,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  deleteHistoryInfoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'right',
  },
  deleteHistoryInfoItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    textAlign: 'right',
    lineHeight: 20,
  },

  // Date Filter Modal Styles
  dateFilterModalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    alignItems: 'center',
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    height: 300,
    marginBottom: 20,
  },
  datePickerColumn: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 10,
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
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  datePickerScrollContent: {
    paddingVertical: 5,
  },
  datePickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  datePickerItemSelected: {
    backgroundColor: '#007AFF',
  },
  datePickerItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  datePickerItemTextSelected: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  dateFilterActions: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
});