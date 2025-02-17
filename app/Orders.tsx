import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet,Image, TouchableOpacity } from 'react-native';
import { useNavigation ,useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import axios, { AxiosError } from 'axios';
import { useAppContext } from '@/components/AppContext';
import { Order, OrderStatus } from '@/constants/Classes';
import { format, differenceInDays } from 'date-fns';
import tw from 'tailwind-react-native-classnames';
import { Color, FontSize } from '@/GlobalStyles';
import { jwtDecode } from 'jwt-decode';
import { Route } from 'expo-router/build/Route';
import { router, useLocalSearchParams,  } from 'expo-router';
import LogInRequiredPage from '@/components/LogInRequiredPage';
import { useAppData } from '@/components/AppDataProvider';
import config from '@/components/config';
import { Client } from '@stomp/stompjs';
import RatingFeedbackModal from '@/components/RatingFeedbackModal';
var SockJS = require('sockjs-client/dist/sockjs.js');



type IconConfig = {
  name: string;
  color: string;
  Component: typeof Icon | typeof TabBarIcon;
};

const STATUS_ICON_CONFIG: Record<OrderStatus, IconConfig> = {
  delivered: { name: 'check-circle', color: 'green', Component: Icon },
  "picked up": { name: 'cube-outline', color: '#0077b6', Component: TabBarIcon },
  Pending: { name: 'schedule', color: 'orange', Component: Icon },
  "cancelled":{ name: 'schedule', color: 'red', Component: Icon }
};

const StatusIcon: React.FC<{ status?: OrderStatus }> = React.memo(({ status = 'pending' }) => {
  const { name, color, Component } = STATUS_ICON_CONFIG[status];
  return <Component name={name} color={color} size={24} />;
});


const OrderDateDisplay: React.FC<{ orderDate: string | Date }> = ({ orderDate }) => {
  const today = new Date();
  const orderDateTime = new Date(orderDate);
  const daysDifference = differenceInDays(today, orderDateTime);

  let displayText;
  if (daysDifference === 0) {
    displayText = `${format(orderDateTime, 'yyyy-MM-dd')} Today`;
  } else if (daysDifference <= 7) {
    displayText = `${daysDifference} Days`;
  } else if (daysDifference <= 15) {
    displayText = `${format(orderDateTime, 'yyyy-MM-dd')} Last Week`;
  } else {
    displayText = format(orderDateTime, 'yyyy-MM-dd');
  }

  return <Text>{displayText}</Text>;
};

const badgeColor = (status: OrderStatus) => {
  switch (status) {
    case 'Pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'picked up':
      return 'bg-blue-100 text-blue-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-red-100 text-red-800';
  }
};

const Orders: React.FC = () => {
  const navigation = useNavigation();
  const { state,dispatch } = useAppContext();
  const [isRatingModalVisible,setisRatingModalVisible] = useState<boolean>(false)
  const [orderedProducts, setOrderedProducts] = useState([]);
  var cartItems = state.cartItems || {};
  useFocusEffect(
    useCallback(()=>{
      if(state.isRated){
        setisRatingModalVisible(true)
        setOrderedProducts(cartItems)
        dispatch({ type: 'CLEAN_CART'});
      }
      return () => {
 
      };
  },[navigation]))


  const OrderItem: React.FC<{ order: Order; onPress: () => void }> = React.memo(({ order, onPress }) => (
    <TouchableOpacity style={styles.orderItem} onPress={onPress}>
      <View style={tw`flex-row justify-between items-center my-2`}>
        <Text style={styles.date}>Date:</Text>
        <Text style={[tw`text-base font-medium px-2 rounded`,{backgroundColor: Color.COLORALICEBLUE}]}>
          <OrderDateDisplay orderDate={order.creationDate} />
        </Text>
      </View>
      <View style={tw`flex-row items-center my-2`}>
        <Text style={styles.address}>Address:</Text>
        <Text style={tw`ml-5 text-base`} numberOfLines={2}>{order.adresse}</Text>
      </View>
      <View style={tw`flex-row justify-between items-center my-2`}>
        <Text style={styles.total}>Total:</Text>
        <Text style={tw`text-lg font-medium`} color="#e84c11">£ {order.totalAmount}</Text>
        <View style={[styles.statusContainer, tw`px-2 py-1 rounded-xl ${badgeColor(order.status)}`]}>
          <StatusIcon status={order.status} />
          <Text style={styles.status}>{order.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  ));

  const renderItem = useCallback(({ item }: { item: Order }) => (
    <OrderItem
      order={item}
      onPress={() => router.navigate(`/OrderDetails?id=${item.id }&&pres=Orders`)}
    />
  ), [navigation]);

  const keyExtractor = useCallback((item: Order) => item.id, []);

  return (
    <View style={styles.container}>
      <RatingFeedbackModal
              visible={isRatingModalVisible}
              onClose={() => {setisRatingModalVisible(false),dispatch({type: 'Set_isRated',payload: false})}}
              onSubmit={()=>{setisRatingModalVisible(false),dispatch({type: 'Set_isRated',payload: false})}}
              products={state.orderedProducts}
            />
      {!state.isLoggedIn ?
      (
        <LogInRequiredPage message='Please log in to view your Orders' page='Orders'/>):
      (
        state.userInfos.myOrders.length > 0?
      <FlatList
        data={state.userInfos.myOrders}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContainer}
      />
        : 
        <View style={[tw`justify-center items-center h-80`]}>
          <Text style={[tw`text-base`]}>Your Order List is empty !</Text>
          <Image source={require("@/assets/images/icons8-aucun-résultat-48.png")}/>
        </View>

      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.mainbackgroundcolor, // Light Gray for the page background
  },
  listContainer: {
    marginVertical: 8,
    padding: 16,
  },
  orderItem: {
    backgroundColor: Color.colorWhite, // White for card background
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#0077b6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  date: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  address: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  total: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});


export default Orders;
