import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ExploreScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>SellSnap - نظام إدارة المبيعات</Text>
        <Text style={styles.subtitle}>Explore Features</Text>
        
        <View style={styles.featureContainer}>
          <Text style={styles.featureTitle}>📊 الميزات الرئيسية</Text>
          
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🛒</Text>
            <Text style={styles.featureText}>إدارة العملاء والمبيعات</Text>
          </View>
          
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📦</Text>
            <Text style={styles.featureText}>إدارة المخزون والكميات</Text>
          </View>
          
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>👁️</Text>
            <Text style={styles.featureText}>عرض الأصناف المتوفرة</Text>
          </View>
          
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>➕</Text>
            <Text style={styles.featureText}>إضافة وتحديث الأصناف</Text>
          </View>
          
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📊</Text>
            <Text style={styles.featureText}>تتبع تاريخ المبيعات</Text>
          </View>
          
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>💾</Text>
            <Text style={styles.featureText}>قاعدة بيانات محلية SQLite</Text>
          </View>
        </View>
        
        <Text style={styles.description}>
          تطبيق متكامل لإدارة المبيعات والمخزون مع واجهة سهلة الاستخدام ونظام قاعدة بيانات محلية لضمان الأداء السريع.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#007AFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  featureContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    textAlign: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
