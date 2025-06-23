#include "test.h"
struct diy_ops g_ops;
int init(void)
{
    init_ops(&g_ops);
}

int read(char *string)
{
    get_ops()->read(string);
    return 0;
}

int write(char *string)
{
    g_ops.write(string);
    return 0;
}

extern struct diy_ops my_ops;
int clear(char *string)
{
    my_ops.clear();
}

int main(void)
{
    init();
    // 
}