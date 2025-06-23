#include "test.h"

char *my_string[100];

void my_read(char *string)
{
    strcpy(string, my_string);
}

void my_write(char *string)
{
    strcpy(my_string, string);
}

void my_clear(char *string)
{
    memset(my_string, 0, 100);
}

struct diy_ops my_ops = {
    .read = my_read,
    .write = my_write,
    .clear = my_clear
};

void init_ops(struct diy_ops *ops)
{
    *ops = my_ops;
}

struct diy_ops *get_ops(void)
{
    return &my_ops;
}