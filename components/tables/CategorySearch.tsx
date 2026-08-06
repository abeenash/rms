import { Search } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import Text from "../AppText";

interface CategorySearchProps {
    search: string;
    onSearchChange: (text: string) => void;
    isSearchLoading: boolean;
    categories: string[];
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
    colors: any;
}

export const CategorySearch: React.FC<CategorySearchProps> = React.memo(({
    search,
    onSearchChange,
    isSearchLoading,
    categories,
    selectedCategory,
    onSelectCategory,
    colors
}) => {
    return (
        <View style={styles.staticControlsContainer}>
            <View style={[styles.searchContainer, { backgroundColor: colors.searchBg }]}>
                <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: colors.textMain }]}
                    placeholder="Search menu items..."
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={onSearchChange}
                />
                {isSearchLoading && (
                    <ActivityIndicator size="small" color={colors.accentMain} style={{ marginLeft: 8 }} />
                )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow} contentContainerStyle={{ gap: 8 }}>
                {categories.map((cat) => {
                    const isSelected = selectedCategory === cat
                    return (
                        <TouchableOpacity
                            key={cat}
                            onPress={() => onSelectCategory(cat)}
                            style={[styles.catChip, { backgroundColor: isSelected ? colors.accentMain : colors.cardBg, borderColor: isSelected ? colors.accentMain : colors.border }]}
                        >
                            <Text style={[styles.catChipText, { color: isSelected ? "#FFFFFF" : colors.textMuted, fontWeight: isSelected ? "700" : "500" }]}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    )
                })}
            </ScrollView>
        </View>
    )
})

const styles = StyleSheet.create({
    staticControlsContainer: {
        paddingHorizontal: 14,
        paddingTop: 14,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        marginBottom: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        height: "100%",
    },
    categoryRow: {
        flexDirection: "row",
        marginBottom: 8,
    },
    catChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 99,
        borderWidth: 1,
    },
    catChipText: {
        fontSize: 13,
    },
})