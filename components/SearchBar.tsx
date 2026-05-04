import React from 'react';
import { View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props{
    placeholder: string;
    onPress?: () => void;
    value: string;
    onChangeText: (text: string) => void;
}
const SearchBar = ({placeholder, onPress, value, onChangeText} : Props) => {
  return (
    <View className="flex-row items-center bg-[#1A1B2E] rounded-full mt-8 px-5 py-4">
      <Ionicons 
      resizeMode="contain"
        name="search-outline"
        size={25}
        color="#B8BBD9"
        style={{ marginRight: 8 }}
      />
      <TextInput
        onPress={onPress}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#B8BBD9"
        className='flex-1 ml-2 text-white'
      />
    </View>
  );
};

export default SearchBar;
