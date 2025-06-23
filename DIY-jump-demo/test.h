struct diy_ops {
    void (*read)(char *string);
    void (*write)(char *string);
    void (*clear)(void);
};
struct diy_ops *get_ops(void);
